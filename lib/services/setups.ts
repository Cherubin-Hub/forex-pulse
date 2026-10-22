import type { TradingSetup } from "@/types/setup";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapRowToSetup } from "@/lib/supabase/mappers";
import { getAuthenticatedUserId } from "@/lib/auth/user";

/**
 * Retrieves currently active trading setups (WAITING_FOR_CONFIRMATION or ENTRY_TRIGGERED)
 * specifically belonging to the authenticated user.
 */
export async function getActiveSetups(): Promise<TradingSetup[]> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return [];

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("trading_setups")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["WAITING_FOR_CONFIRMATION", "ENTRY_TRIGGERED"])
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      if (error)
        console.warn("Supabase active setups query error:", error.message);
      return [];
    }

    return data.map(mapRowToSetup);
  } catch (err) {
    console.warn(
      "Supabase client unavailable for active setups:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

/**
 * Retrieves closed / historical setups (TP_REACHED, SL_HIT, INVALIDATED, EXPIRED)
 * specifically belonging to the authenticated user.
 */
export async function getHistorySetups(): Promise<TradingSetup[]> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return [];

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("trading_setups")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["TP_REACHED", "SL_HIT", "INVALIDATED", "EXPIRED"])
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      if (error)
        console.warn("Supabase history setups query error:", error.message);
      return [];
    }

    return data.map(mapRowToSetup);
  } catch (err) {
    console.warn(
      "Supabase client unavailable for history setups:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

/**
 * Retrieves paginated historical setups with total count.
 */
export async function getHistorySetupsPaged(
  page = 1,
  limit = 20,
): Promise<{ setups: TradingSetup[]; total: number }> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { setups: [], total: 0 };

    const supabase = createAdminClient();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await supabase
      .from("trading_setups")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .in("status", ["TP_REACHED", "SL_HIT", "INVALIDATED", "EXPIRED"])
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error || !data) {
      return { setups: [], total: 0 };
    }

    return {
      setups: data.map(mapRowToSetup),
      total: count ?? data.length,
    };
  } catch (err) {
    console.warn("Paged history query failed:", err);
    return { setups: [], total: 0 };
  }
}