import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { settingsSchema, type UserSettings } from "@/lib/schemas/settings";

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const { data, error } = await createAdminClient()
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error || !data)
    throw new Error(
      "Account settings unavailable. Apply the database migration and save your settings.",
    );
  return settingsSchema.parse({
    traderProfile: data.trader_profile,
    riskPerTradePercent: Number(data.risk_per_trade_percent),
    minRiskReward: Number(data.min_risk_reward),
    maxOpenSetups: data.max_open_setups,
    sessionFocus: data.session_focus,
    newsSensitivity:
      data.news_sensitivity === "MODERATE" ? "BALANCED" : data.news_sensitivity,
    accountBalance: Number(data.account_balance),
    leverage: Number(data.leverage),
    maxDailyLossR: Number(data.max_daily_loss_r),
    automationEnabled: data.automation_enabled,
    manualLockoutUntil: data.manual_lockout_until,
  });
}
