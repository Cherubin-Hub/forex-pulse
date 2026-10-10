"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UserSettings } from "@/lib/schemas/settings";

export interface SettingsActionResult {
  success: boolean;
  data?: Partial<UserSettings>;
  error?: string;
}

/**
 * Server Action to fetch user settings from Supabase.
 */
export async function fetchCloudSettings(): Promise<SettingsActionResult> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // 1. Enforce Authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized" };

    // 2. Fetch specific to this user
    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    if (!data) return { success: true, data: undefined };

    const cloudSettings: Partial<UserSettings> = {
      traderProfile: data.trader_profile as UserSettings["traderProfile"],
      riskPerTradePercent: Number(data.risk_per_trade_percent),
      minRiskReward: Number(data.min_risk_reward),
      maxOpenSetups: Number(data.max_open_setups),
      sessionFocus: data.session_focus as UserSettings["sessionFocus"],
      newsSensitivity: data.news_sensitivity as UserSettings["newsSensitivity"],
    };

    return { success: true, data: cloudSettings };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch cloud settings";
    return { success: false, error: message };
  }
}

/**
 * Server Action to save or update settings in Supabase.
 */
export async function saveCloudSettings(settings: UserSettings): Promise<SettingsActionResult> {
  try {
    const supabase = await createServerSupabaseClient();

    // 1. Enforce Authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized" };

    const { data: existing } = await supabase
      .from("user_settings")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    // 2. Use the actual user's UUID
    const payload = {
      user_id: user.id,
      trader_profile: settings.traderProfile,
      risk_per_trade_percent: settings.riskPerTradePercent,
      min_risk_reward: settings.minRiskReward,
      max_open_setups: settings.maxOpenSetups,
      session_focus: settings.sessionFocus,
      news_sensitivity: settings.newsSensitivity,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (existing?.id) {
      const res = await supabase.from("user_settings").update(payload).eq("id", existing.id);
      error = res.error;
    } else {
      const res = await supabase.from("user_settings").insert(payload);
      error = res.error;
    }

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save cloud settings";
    return { success: false, error: message };
  }
}
