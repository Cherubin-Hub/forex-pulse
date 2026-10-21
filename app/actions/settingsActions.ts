"use server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUserId } from "@/lib/auth/user";
import { settingsSchema, type UserSettings } from "@/lib/schemas/settings";
import { getUserSettings } from "@/lib/services/userSettings";

export async function fetchCloudSettings(): Promise<{
  success: boolean;
  data?: UserSettings;
  error?: string;
}> {
  try {
    return {
      success: true,
      data: await getUserSettings(await requireUserId()),
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Settings unavailable",
    };
  }
}

export async function saveCloudSettings(
  input: UserSettings,
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireUserId();
    const settings = settingsSchema.parse(input);
    const { error } = await createAdminClient().from("user_settings").upsert(
      {
        user_id: userId,
        trader_profile: settings.traderProfile,
        risk_per_trade_percent: settings.riskPerTradePercent,
        min_risk_reward: settings.minRiskReward,
        max_open_setups: settings.maxOpenSetups,
        session_focus: settings.sessionFocus,
        news_sensitivity: settings.newsSensitivity,
        account_balance: settings.accountBalance,
        leverage: settings.leverage,
        max_daily_loss_r: settings.maxDailyLossR,
        automation_enabled: settings.automationEnabled,
        manual_lockout_until: settings.manualLockoutUntil,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Settings could not be saved",
    };
  }
}
