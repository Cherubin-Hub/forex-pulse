import type { NewsSensitivity, TraderProfile, UserSettings } from "@/lib/schemas/settings";

export const SETTINGS_STORAGE_KEY = "forex-pulse:settings:v1";

export const DEFAULT_SETTINGS: UserSettings = {
  traderProfile: "DAY_TRADER",
  riskPerTradePercent: 1,
  minRiskReward: 2,
  maxOpenSetups: 3,
  sessionFocus: ["LONDON", "NEW_YORK"],
  newsSensitivity: "CONSERVATIVE",
};

export const TRADER_PROFILE_OPTIONS: Record<
  TraderProfile,
  { label: string; description: string; timeframes: string[] }
> = {
  SCALPER: {
    label: "Scalper",
    description: "Quick trades lasting minutes. Needs tight spreads and precise timing.",
    timeframes: ["M1", "M5", "M15"],
  },
  DAY_TRADER: {
    label: "Day Trader",
    description: "Intraday trades closed before the session ends.",
    timeframes: ["M15", "H1", "H4"],
  },
  SWING_TRADER: {
    label: "Swing Trader",
    description: "Holds positions for days, following the higher-timeframe trend.",
    timeframes: ["H4", "D1"],
  },
};

export const NEWS_SENSITIVITY_OPTIONS: Record<
  NewsSensitivity,
  { label: string; description: string; preReleaseMinutes: number; postReleaseMinutes: number }
> = {
  AGGRESSIVE: {
    label: "Aggressive",
    description: "Trades close to news. Warns only right before release.",
    preReleaseMinutes: 5,
    postReleaseMinutes: 5,
  },
  BALANCED: {
    label: "Balanced",
    description: "Moderate buffer around high-impact releases.",
    preReleaseMinutes: 15,
    postReleaseMinutes: 10,
  },
  CONSERVATIVE: {
    label: "Conservative",
    description: "Stays flat well before and after high-impact news.",
    preReleaseMinutes: 30,
    postReleaseMinutes: 15,
  },
};
