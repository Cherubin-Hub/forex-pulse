import type { GoldDriver, KeyLevel } from "@/types/gold";
import { MOCK_GOLD_DRIVERS, MOCK_KEY_LEVELS } from "@/lib/mock/gold";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapRowToGoldDriver, mapRowToKeyLevel } from "@/lib/supabase/mappers";

/**
 * Controller service to retrieve Gold macro driver assets.
 * Queries Supabase first; falls back to deterministic mock data if empty or offline.
 */
export async function getGoldDrivers(): Promise<GoldDriver[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("gold_drivers")
      .select("*")
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0) {
      if (error) console.warn("Supabase gold drivers query error, using mock fallback:", error.message);
      return MOCK_GOLD_DRIVERS;
    }

    return data.map(mapRowToGoldDriver);
  } catch (err) {
    console.warn("Supabase client unavailable, using mock gold drivers fallback:", err instanceof Error ? err.message : err);
    return MOCK_GOLD_DRIVERS;
  }
}

/**
 * Controller service to retrieve Gold institutional key price levels.
 * Queries Supabase first; falls back to deterministic mock data if empty or offline.
 */
export async function getGoldKeyLevels(): Promise<KeyLevel[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("gold_key_levels")
      .select("*")
      .order("price", { ascending: false });

    if (error || !data || data.length === 0) {
      if (error) console.warn("Supabase gold key levels query error, using mock fallback:", error.message);
      return MOCK_KEY_LEVELS;
    }

    return data.map(mapRowToKeyLevel);
  } catch (err) {
    console.warn("Supabase client unavailable, using mock key levels fallback:", err instanceof Error ? err.message : err);
    return MOCK_KEY_LEVELS;
  }
}
