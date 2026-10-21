import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapRowToGoldDriver, mapRowToKeyLevel } from "@/lib/supabase/mappers";
import type { GoldDriver, KeyLevel } from "@/types/gold";
export async function getGoldDrivers(): Promise<GoldDriver[]> {
  try {
    const { data, error } = await createAdminClient()
      .from("gold_drivers")
      .select("*")
      .eq("data_source", "verified")
      .gte("verified_at", new Date(Date.now() - 6 * 3600000).toISOString())
      .order("verified_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRowToGoldDriver);
  } catch {
    return [];
  }
}
export async function getGoldKeyLevels(): Promise<KeyLevel[]> {
  try {
    const { data, error } = await createAdminClient()
      .from("gold_key_levels")
      .select("*")
      .eq("data_source", "verified")
      .gte("verified_at", new Date(Date.now() - 24 * 3600000).toISOString())
      .order("price", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRowToKeyLevel);
  } catch {
    return [];
  }
}
