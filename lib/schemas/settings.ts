import { z } from "zod";

export const TRADER_PROFILE_VALUES = ["SCALPER", "DAY_TRADER", "SWING_TRADER"] as const;
export const NEWS_SENSITIVITY_VALUES = ["AGGRESSIVE", "BALANCED", "CONSERVATIVE"] as const;
export const SESSION_ID_VALUES = ["ASIAN", "LONDON", "NEW_YORK"] as const;

export const settingsSchema = z.object({
  traderProfile: z.enum(TRADER_PROFILE_VALUES),

  riskPerTradePercent: z
    .number("Enter a number")
    .min(0.1, "Minimum is 0.1%")
    .max(5, "Maximum is 5% — protect your account"),

  minRiskReward: z
    .number("Enter a number")
    .min(1, "R:R below 1:1 is not allowed")
    .max(10, "Maximum is 1:10"),

  maxOpenSetups: z
    .number("Enter a number")
    .int("Whole numbers only")
    .min(1, "At least 1")
    .max(20, "Maximum is 20"),

  sessionFocus: z
    .array(z.enum(SESSION_ID_VALUES))
    .min(1, "Select at least one session"),

  newsSensitivity: z.enum(NEWS_SENSITIVITY_VALUES),
});

export type UserSettings = z.infer<typeof settingsSchema>;
export type TraderProfile = UserSettings["traderProfile"];
export type NewsSensitivity = UserSettings["newsSensitivity"];
