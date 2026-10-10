import type { EconomicEvent } from "@/types/calendar";
import { MOCK_EVENTS } from "@/lib/mock/events";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapRowToEvent } from "@/lib/supabase/mappers";

/**
 * Single entry point for economic calendar data.
 * Queries Supabase first; falls back to mock events if offline or database empty.
 */
export async function getEconomicEvents(): Promise<EconomicEvent[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("economic_events")
      .select("*")
      .order("scheduled_at", { ascending: true });

    if (error || !data || data.length === 0) {
      if (error) console.warn("Supabase economic events query error, using mock fallback:", error.message);
      return [...MOCK_EVENTS].sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      );
    }

    return data.map(mapRowToEvent);
  } catch (err) {
    console.warn("Supabase client unavailable, using mock events fallback:", err instanceof Error ? err.message : err);
    return [...MOCK_EVENTS].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
  }
}
