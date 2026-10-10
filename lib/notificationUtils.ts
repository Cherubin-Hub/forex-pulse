import type { EconomicEvent } from "@/types/calendar";
import type { TradingSetup } from "@/types/setup";
import type { SystemNotification } from "@/types/notification";
import { formatClockPHT, formatDuration } from "@/lib/formatters";

/**
 * Synthesizes real-time system alerts from active macroeconomic events and trading setups.
 */
export function generateSystemNotifications(
  events: EconomicEvent[],
  setups: TradingSetup[],
  now: Date
): SystemNotification[] {
  const notifications: SystemNotification[] = [];

  // 1. High-Impact News Alerts (Scheduled within next 60 minutes)
  for (const event of events) {
    if (event.impact === "HIGH") {
      const msUntil = new Date(event.scheduledAt).getTime() - now.getTime();
      // Within next 60 minutes
      if (msUntil > 0 && msUntil <= 60 * 60 * 1000) {
        const isImminent = msUntil <= 30 * 60 * 1000;
        notifications.push({
          id: `notif-event-${event.id}`,
          type: "NEWS_RISK",
          priority: isImminent ? "CRITICAL" : "HIGH",
          title: isImminent ? `🚨 NO-TRADE ZONE: ${event.title}` : `High-Impact Catalyst Approaching`,
          message: `${event.currency} release scheduled in ${formatDuration(msUntil)} (${formatClockPHT(event.scheduledAt)} PHT). Volatility expected.`,
          timestamp: new Date().toISOString(),
          read: false,
          linkHref: "/calendar",
        });
      }
    }
  }

  // 2. Active Trade Setup Alerts
  for (const s of setups) {
    if (s.status === "ENTRY_TRIGGERED") {
      notifications.push({
        id: `notif-setup-${s.id}`,
        type: "SETUP_STATUS",
        priority: "HIGH",
        title: `Entry Triggered: ${s.symbol} ${s.direction}`,
        message: `Price entered execution zone [${s.entryMin} - ${s.entryMax}]. Stop loss active at ${s.stopLoss}.`,
        timestamp: s.updatedAt,
        read: false,
        linkHref: "/setups",
        symbol: s.symbol,
      });
    } else if (s.status === "WAITING_FOR_CONFIRMATION") {
      notifications.push({
        id: `notif-setup-${s.id}`,
        type: "SETUP_STATUS",
        priority: "INFO",
        title: `Pending Setup: ${s.symbol} ${s.direction}`,
        message: `Awaiting structural confirmation. Target: 1:${s.riskReward.toFixed(1)} RR.`,
        timestamp: s.createdAt,
        read: true,
        linkHref: "/setups",
        symbol: s.symbol,
      });
    }
  }

  // 3. Portfolio Capacity Warnings
  const openCount = setups.filter(
    (s) => s.status === "WAITING_FOR_CONFIRMATION" || s.status === "ENTRY_TRIGGERED"
  ).length;

  if (openCount >= 3) {
    notifications.push({
      id: "notif-risk-capacity",
      type: "RISK_WARNING",
      priority: openCount >= 5 ? "CRITICAL" : "HIGH",
      title: "Portfolio Exposure Guard",
      message: `You currently have ${openCount} setups open. Ensure your cumulative risk does not exceed maximum portfolio tolerance.`,
      timestamp: new Date().toISOString(),
      read: false,
      linkHref: "/risk",
    });
  }

  // Sort by critical priority first, then recency
  const priorityWeight = { CRITICAL: 3, HIGH: 2, INFO: 1 };
  return notifications.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);
}
