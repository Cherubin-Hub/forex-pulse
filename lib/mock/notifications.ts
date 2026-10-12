import type { SystemNotification } from "@/types/notification";

/**
 * Deterministic starter system notifications for offline fallback and initial seeding.
 */
export const MOCK_NOTIFICATIONS: SystemNotification[] = [
  {
    id: "notif-mock-1",
    userId: null,
    type: "NEWS_RISK",
    priority: "CRITICAL",
    title: "🚨 NO-TRADE ZONE: US CPI Release",
    message: "USD CPI release scheduled in under 30 minutes. Strict volatility halt active across all USD pairs.",
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 min ago
    read: false,
    linkHref: "/calendar",
    actionLabel: "View Calendar",
  },
  {
    id: "notif-mock-2",
    userId: null,
    type: "SETUP_STATUS",
    priority: "HIGH",
    title: "Entry Triggered: GBPUSD LONG",
    message: "Price entered execution zone [1.3150 - 1.3160]. Stop loss active at 1.3130.",
    symbol: "GBPUSD",
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(), // 25 min ago
    read: false,
    linkHref: "/setups",
    actionLabel: "Review Setup",
  },
  {
    id: "notif-mock-3",
    userId: null,
    type: "RISK_WARNING",
    priority: "HIGH",
    title: "Portfolio Exposure Guard",
    message: "You currently have 2 active setups open. Ensure your cumulative risk does not exceed maximum portfolio tolerance.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hr ago
    read: false,
    linkHref: "/risk",
    actionLabel: "Check Risk",
  },
  {
    id: "notif-mock-4",
    userId: null,
    type: "PRICE_SIGNAL",
    priority: "INFO",
    title: "Key Level Tested: EURUSD",
    message: "EURUSD surged to 1.1265 resistance liquidity sweep. H1 confirmation required.",
    symbol: "EURUSD",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hrs ago
    read: true,
    linkHref: "/setups",
    actionLabel: "View Chart",
  },
  {
    id: "notif-mock-5",
    userId: null,
    type: "SESSION_ALERT",
    priority: "INFO",
    title: "London Session Open",
    message: "European market liquidity active. Elevated volatility expected on EUR and GBP crosses.",
    timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(), // 4 hrs ago
    read: true,
    linkHref: "/",
    actionLabel: "Dashboard",
  },
];
