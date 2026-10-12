"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  Flame,
  Target,
  ShieldAlert,
  Zap,
  Globe,
  CheckCheck,
  ExternalLink,
  Volume2,
  VolumeX,
  BellRing,
} from "lucide-react";
import type { SystemNotification, NotificationType } from "@/types/notification";
import type { EconomicEvent } from "@/types/calendar";
import type { TradingSetup } from "@/types/setup";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FilterTab = "ALL" | "NEWS_RISK" | "SETUP_STATUS" | "RISK_WARNING" | "PRICE_SIGNAL";

interface NotificationsDropdownProps {
  initialNotifications?: SystemNotification[];
  events?: EconomicEvent[];
  setups?: TradingSetup[];
}

export function NotificationsDropdown({
  initialNotifications,
  events,
  setups,
}: NotificationsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isSoundEnabled,
    toggleSound,
    desktopPermission,
    requestDesktopPermission,
  } = useNotifications({
    initialNotifications,
    events,
    setups,
  });

  const filteredNotifications = useMemo(() => {
    if (activeTab === "ALL") return notifications;
    return notifications.filter((n: SystemNotification) => n.type === activeTab);
  }, [notifications, activeTab]);

  // Close dropdown on outside click or escape key
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
      case "PRICE_SIGNAL":
        return <Zap className="h-4 w-4 text-sky-400" />;
      case "SESSION_ALERT":
        return <Globe className="h-4 w-4 text-emerald-400" />;
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
            {unreadCount > 9 ? "9+" : unreadCount}
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

          <div className="absolute right-0 top-11 z-50 w-84 sm:w-96 rounded-xl border border-border bg-card p-3 shadow-xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
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

              {/* Utility actions: Sound chime toggle & Desktop Push */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleSound}
                  title={isSoundEnabled ? "Mute alert chimes" : "Enable alert chimes"}
                  className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {isSoundEnabled ? (
                    <Volume2 className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>

                {desktopPermission !== "granted" && (
                  <button
                    type="button"
                    onClick={requestDesktopPermission}
                    title="Enable desktop notifications"
                    className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <BellRing className="h-3.5 w-3.5 text-amber-500" />
                  </button>
                )}

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors ml-1"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab("ALL")}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-semibold transition-colors shrink-0",
                  activeTab === "ALL"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("NEWS_RISK")}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-semibold transition-colors shrink-0",
                  activeTab === "NEWS_RISK"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                News
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("SETUP_STATUS")}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-semibold transition-colors shrink-0",
                  activeTab === "SETUP_STATUS"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                Setups
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("RISK_WARNING")}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-semibold transition-colors shrink-0",
                  activeTab === "RISK_WARNING"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                Risk
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("PRICE_SIGNAL")}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-semibold transition-colors shrink-0",
                  activeTab === "PRICE_SIGNAL"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                Signals
              </button>
            </div>

            {/* Notification Items List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-border/40 space-y-1">
              {filteredNotifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No active alerts for this category.
                </div>
              ) : (
                filteredNotifications.map((notif: SystemNotification) => (
                  <div
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    className={cn(
                      "p-2.5 rounded-lg transition-colors cursor-pointer space-y-1",
                      notif.read
                        ? "bg-transparent opacity-75 hover:bg-muted/30"
                        : "bg-muted/40 hover:bg-muted/60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        {getNotificationIcon(notif.type)}
                        <span
                          className={cn(
                            notif.priority === "CRITICAL" && "text-rose-500",
                            notif.priority === "HIGH" && "text-amber-500"
                          )}
                        >
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
                          {notif.actionLabel ?? "View Details"}{" "}
                          <ExternalLink className="h-2.5 w-2.5" />
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
