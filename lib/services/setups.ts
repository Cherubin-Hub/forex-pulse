import type { TradingSetup } from "@/types/setup";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapRowToSetup } from "@/lib/supabase/mappers";

/**
 * Retrieves currently active trading setups (WAITING_FOR_CONFIRMATION or ENTRY_TRIGGERED).
 * Queries Supabase first; returns empty list if no setups exist or connection fails.
 */
export async function getActiveSetups(): Promise<TradingSetup[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("trading_setups")
      .select("*")
      .in("status", ["WAITING_FOR_CONFIRMATION", "ENTRY_TRIGGERED"])
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      if (error) console.warn("Supabase active setups query error:", error.message);
      return [];
    }

    return data.map(mapRowToSetup);
  } catch (err) {
    console.warn("Supabase client unavailable for active setups:", err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * Retrieves closed / historical setups (TP_REACHED, SL_HIT, INVALIDATED, EXPIRED).
 */
export async function getHistorySetups(): Promise<TradingSetup[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("trading_setups")
      .select("*")
      .in("status", ["TP_REACHED", "SL_HIT", "INVALIDATED", "EXPIRED"])
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      if (error) console.warn("Supabase history setups query error:", error.message);
      return [];
    }

    return data.map(mapRowToSetup);
  } catch (err) {
    console.warn("Supabase client unavailable for history setups:", err instanceof Error ? err.message : err);
    return [];
  }
}
