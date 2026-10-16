import type { EconomicEvent } from "@/types/calendar";
import { MOCK_EVENTS, resolveEventActual } from "@/lib/mock/events";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapRowToEvent } from "@/lib/supabase/mappers";

/**
 * Single entry point for economic calendar data.
 * Queries Supabase first; falls back to mock events if offline or database empty.
 * Automatically resolves and persists released actual numbers when catalysts pass their scheduled time.
 */
export async function getEconomicEvents(): Promise<EconomicEvent[]> {
  const now = new Date();

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("economic_events")
      .select("*")
      .order("scheduled_at", { ascending: true });

    if (error || !data || data.length === 0) {
      if (error) console.warn("Supabase economic events query error, using mock fallback:", error.message);
      return [...MOCK_EVENTS]
        .map((e) => resolveEventActual(e, now))
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    }

    const events = data.map(mapRowToEvent);

    // Auto-resolve any released events where actual is missing
    const missingActuals = events.filter(
      (e) => new Date(e.scheduledAt).getTime() <= now.getTime() && (!e.actual || e.actual === "—")
    );

    if (missingActuals.length > 0) {
      try {
        const admin = createAdminClient();
        for (const item of missingActuals) {
          const resolved = resolveEventActual(item, now);
          if (resolved.actual && resolved.actual !== "—") {
            item.actual = resolved.actual;
            admin
              .from("economic_events")
              .update({ actual: resolved.actual })
              .eq("id", item.id)
              .then(() => {});
          }
        }
      } catch (adminErr) {
        console.warn("[Calendar] Background auto-release persistence failed:", adminErr);
      }
    }

    return events;
  } catch (err) {
    console.warn("Supabase client unavailable, using mock events fallback:", err instanceof Error ? err.message : err);
    return [...MOCK_EVENTS]
      .map((e) => resolveEventActual(e, now))
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }
}
