import type { EconomicEvent } from "@/types/calendar";
import type { TradingSetup } from "@/types/setup";
import type { SystemNotification } from "@/types/notification";
import { formatClockPHT, formatDuration } from "@/lib/formatters";

const OFFLINE_READ_IDS_KEY = "fp_read_notification_ids_v1";

/**
 * Retrieves offline cached read notification IDs from LocalStorage.
 */
export function getOfflineReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const raw = localStorage.getItem(OFFLINE_READ_IDS_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as string[];
    return new Set<string>(parsed);
  } catch {
    return new Set<string>();
  }
}

/**
 * Persists an offline read notification ID into LocalStorage.
 */
export function saveOfflineReadId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getOfflineReadIds();
    current.add(id);
    localStorage.setItem(OFFLINE_READ_IDS_KEY, JSON.stringify(Array.from(current)));
  } catch (err) {
    console.debug("[NotificationUtils] Failed to persist read ID:", err);
  }
}

/**
 * Persists multiple read notification IDs into LocalStorage.
 */
export function saveAllOfflineReadIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const current = getOfflineReadIds();
    ids.forEach((id) => current.add(id));
    localStorage.setItem(OFFLINE_READ_IDS_KEY, JSON.stringify(Array.from(current)));
  } catch (err) {
    console.debug("[NotificationUtils] Failed to persist read IDs:", err);
  }
}

/**
 * Synthesizes real-time system alerts by merging persisted inbox records
 * with live macroeconomic countdowns and active setup triggers.
 */
export function generateSystemNotifications(
  persistedNotifications: SystemNotification[],
  events: EconomicEvent[],
  setups: TradingSetup[],
  now: Date
): SystemNotification[] {
  const map = new Map<string, SystemNotification>();

  // 1. Add Persisted Notifications first
  for (const n of persistedNotifications) {
    map.set(n.id, n);
  }

  // 2. High-Impact News Alerts (Live Countdown within next 60 minutes)
  for (const event of events) {
    if (event.impact === "HIGH") {
      const msUntil = new Date(event.scheduledAt).getTime() - now.getTime();
      // Within next 60 minutes
      if (msUntil > 0 && msUntil <= 60 * 60 * 1000) {
        const isImminent = msUntil <= 30 * 60 * 1000;
        const eventId = `notif-event-${event.id}`;
        // Preserve read status if already persisted/read
        const existing = map.get(eventId);

        map.set(eventId, {
          id: eventId,
          type: "NEWS_RISK",
          priority: isImminent ? "CRITICAL" : "HIGH",
          title: isImminent ? `🚨 NO-TRADE ZONE: ${event.title}` : `High-Impact Catalyst Approaching`,
          message: `${event.currency} release scheduled in ${formatDuration(msUntil)} (${formatClockPHT(event.scheduledAt)} PHT). Volatility expected.`,
          timestamp: new Date().toISOString(),
          read: existing ? existing.read : false,
          linkHref: "/calendar",
          actionLabel: "View Calendar",
        });
      }
    }
  }

  // 3. Active Trade Setup Alerts
  for (const s of setups) {
    const setupId = `notif-setup-${s.id}`;
    const existing = map.get(setupId);

    if (s.status === "ENTRY_TRIGGERED") {
      map.set(setupId, {
        id: setupId,
        type: "SETUP_STATUS",
        priority: "HIGH",
        title: `Entry Triggered: ${s.symbol} ${s.direction}`,
        message: `Price entered execution zone [${s.entryMin} - ${s.entryMax}]. Stop loss active at ${s.stopLoss}.`,
        timestamp: s.updatedAt,
        read: existing ? existing.read : false,
        linkHref: "/setups",
        symbol: s.symbol,
        actionLabel: "Trade Setup",
      });
    } else if (s.status === "WAITING_FOR_CONFIRMATION" && !existing) {
      map.set(setupId, {
        id: setupId,
        type: "SETUP_STATUS",
        priority: "INFO",
        title: `Pending Setup: ${s.symbol} ${s.direction}`,
        message: `Awaiting structural confirmation. Target: 1:${s.riskReward.toFixed(1)} RR.`,
        timestamp: s.createdAt,
        read: true,
        linkHref: "/setups",
        symbol: s.symbol,
        actionLabel: "View Setup",
      });
    }
  }

  // 4. Portfolio Capacity Warnings
  const openCount = setups.filter(
    (s) => s.status === "WAITING_FOR_CONFIRMATION" || s.status === "ENTRY_TRIGGERED"
  ).length;

  if (openCount >= 3) {
    const capacityId = "notif-risk-capacity";
    const existing = map.get(capacityId);

    map.set(capacityId, {
      id: capacityId,
      type: "RISK_WARNING",
      priority: openCount >= 5 ? "CRITICAL" : "HIGH",
      title: "Portfolio Exposure Guard",
      message: `You currently have ${openCount} setups open. Ensure your cumulative risk does not exceed maximum portfolio tolerance.`,
      timestamp: new Date().toISOString(),
      read: existing ? existing.read : false,
      linkHref: "/risk",
      actionLabel: "Check Exposure",
    });
  }

  // Sort by critical priority first, then recency
  const priorityWeight = { CRITICAL: 3, HIGH: 2, INFO: 1 };
  return Array.from(map.values()).sort(
    (a, b) =>
      priorityWeight[b.priority] - priorityWeight[a.priority] ||
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
