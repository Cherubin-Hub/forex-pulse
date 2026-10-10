# Step 39: Universal Notification Center & Macro Risk Alert Dispatch

## 🎯 Objective
Replace the inert notification bell in the universal app header (`components/layout/Header.tsx`) with an institutional **Real-Time Notification Center & Alert Dispatch**. This step delivers:
1. **Dynamic Alert Generation Engine (`lib/notificationUtils.ts`):** Automatically synthesizes actionable alerts from imminent high-impact news releases (< 60 min), active trade setup triggers, session open transitions, and portfolio risk capacity warnings.
2. **Interactive Notifications Dropdown (`components/notifications/NotificationsDropdown.tsx`):** Renders a responsive dropdown with unread badge counters, priority color-coding, category filtering (`All`, `Macro News`, `Setups`, `Risk`), and one-click "Mark All as Read".
3. **Universal Header Integration (`components/layout/Header.tsx`):** Seamlessly embeds the notification dispatch across every page in the application.

---

## 🛠 Step-by-Step Implementation

### 1. Create Notification Types (`types/notification.ts`)
Define strong types for notification categories, priority levels, and payload structures.

**File:** `types/notification.ts`
```typescript
export type NotificationType = "NEWS_RISK" | "SETUP_STATUS" | "SESSION_ALERT" | "RISK_WARNING";
export type NotificationPriority = "CRITICAL" | "HIGH" | "INFO";

export type SystemNotification = {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  linkHref?: string;
  symbol?: string;
};
```

---

### 2. Create Notification Synthesis Utilities (`lib/notificationUtils.ts`)
Create utility functions to dynamically generate notifications from live calendar events, active trade setups, and session data.

**File:** `lib/notificationUtils.ts`
```typescript
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
```

---

### 3. Create Notifications Dropdown Component (`components/notifications/NotificationsDropdown.tsx`)
Create an interactive popover with unread counter badges, filter chips, and navigation links.

**File:** `components/notifications/NotificationsDropdown.tsx`
```tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Bell, Flame, Target, ShieldAlert, CheckCheck, ExternalLink } from "lucide-react";
import type { SystemNotification, NotificationType } from "@/types/notification";
import { useNow } from "@/hooks/useNow";
import { generateSystemNotifications } from "@/lib/notificationUtils";
import { MOCK_EVENTS } from "@/lib/mock/events";
import { MOCK_ACTIVE_SETUPS } from "@/lib/mock/setups";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FilterTab = "ALL" | "NEWS_RISK" | "SETUP_STATUS" | "RISK_WARNING";

export function NotificationsDropdown() {
  const now = useNow();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Generate dynamic system alerts
  const rawNotifications = useMemo(() => {
    if (!now) return [];
    return generateSystemNotifications(MOCK_EVENTS, MOCK_ACTIVE_SETUPS, now);
  }, [now]);

  // Synchronize read states
  const notifications = useMemo(() => {
    return rawNotifications.map((n) => ({
      ...n,
      read: n.read || readIds.has(n.id),
    }));
  }, [rawNotifications, readIds]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = useMemo(() => {
    if (activeTab === "ALL") return notifications;
    return notifications.filter((n) => n.type === activeTab);
  }, [notifications, activeTab]);

  const markAllAsRead = () => {
    const allIds = new Set(notifications.map((n) => n.id));
    setReadIds(allIds);
  };

  const markAsRead = (id: string) => {
    setReadIds((prev) => new Set(prev).add(id));
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "NEWS_RISK":
        return <Flame className="h-4 w-4 text-rose-500" />;
      case "SETUP_STATUS":
        return <Target className="h-4 w-4 text-primary" />;
      case "RISK_WARNING":
        return <ShieldAlert className="h-4 w-4 text-amber-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="relative">
      {/* Bell Trigger Button */}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open notifications"
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-9 w-9"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white font-mono animate-pulse">
            {unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 top-11 z-50 w-80 sm:w-96 rounded-xl border border-border bg-card p-3 shadow-xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-xs uppercase tracking-wider">
                  Live Alert Dispatch
                </h3>
                {unreadCount > 0 && (
                  <span className="rounded bg-rose-500/10 px-1.5 py-0.2 text-[10px] font-bold text-rose-500">
                    {unreadCount} Unread
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <CheckCheck className="h-3 w-3" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("ALL")}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-semibold transition-colors",
                  activeTab === "ALL" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("NEWS_RISK")}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-semibold transition-colors",
                  activeTab === "NEWS_RISK" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                News
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("SETUP_STATUS")}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-semibold transition-colors",
                  activeTab === "SETUP_STATUS" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                Setups
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("RISK_WARNING")}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-semibold transition-colors",
                  activeTab === "RISK_WARNING" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                Risk
              </button>
            </div>

            {/* Notification Items List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-border/40 space-y-1">
              {filteredNotifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No active alerts for this category.
                </div>
              ) : (
                filteredNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    className={cn(
                      "p-2.5 rounded-lg transition-colors cursor-pointer space-y-1",
                      notif.read ? "bg-transparent opacity-75 hover:bg-muted/30" : "bg-muted/40 hover:bg-muted/60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        {getNotificationIcon(notif.type)}
                        <span className={cn(notif.priority === "CRITICAL" && "text-rose-500")}>
                          {notif.title}
                        </span>
                      </div>
                      {!notif.read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0 mt-1" />
                      )}
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {notif.message}
                    </p>

                    {notif.linkHref && (
                      <div className="pt-1 flex items-center justify-end">
                        <Link
                          href={notif.linkHref}
                          onClick={() => setIsOpen(false)}
                          className="text-[10px] text-primary font-semibold hover:underline inline-flex items-center gap-1"
                        >
                          View Details <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

---

### 4. Upgrade Universal Header (`components/layout/Header.tsx`)
Replace the static placeholder button with `NotificationsDropdown`.

**File:** `components/layout/Header.tsx`
```tsx
"use client";

import { usePathname } from "next/navigation";
import { NAV_SECTIONS } from "@/lib/constants/navigation";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { UserNav } from "@/components/layout/UserNav";
import { NotificationsDropdown } from "@/components/notifications/NotificationsDropdown";

function getPageTitle(pathname: string): string {
  const allItems = NAV_SECTIONS.flatMap((section) => section.items);
  const match = allItems.find((item) => item.href === pathname);
  return match?.title ?? "ForexPulse";
}

export function Header() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-2">
        <MobileSidebar />
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {/* Dynamic Notification Dispatch */}
        <NotificationsDropdown />
        <ThemeToggle />
        <UserNav />
      </div>
    </header>
  );
}
```

---

## 🧪 Verification & Testing
1. Look at the top-right header across any page in the app (`http://localhost:3000/`).
2. Verify that the **Bell** icon renders with an active unread badge counter if there are imminent news risks or open setups.
3. Click the bell to open the **Live Alert Dispatch** dropdown.
4. Test filtering by category (`All`, `News`, `Setups`, `Risk`).
5. Click **Mark all read** and verify the unread badge resets.
6. Click **View Details** on an alert (e.g. news risk) to confirm immediate navigation to `/calendar` or `/setups`.

