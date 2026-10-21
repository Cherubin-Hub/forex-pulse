import "server-only";
import type { EconomicEvent } from "@/types/calendar";
import { MOCK_EVENTS } from "@/lib/mock/events";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapRowToEvent } from "@/lib/supabase/mappers";
import { isDemoMode } from "@/lib/marketQuality";

export async function getCalendarSnapshot(): Promise<{
  events: EconomicEvent[];
  available: boolean;
}> {
  if (isDemoMode()) return { events: MOCK_EVENTS, available: false };
  try {
    const admin = createAdminClient();
    const { data: health, error: healthError } = await admin
      .from("feed_health")
      .select("*")
      .eq("feed", "calendar")
      .single();
    const now = Date.now();
    if (
      healthError ||
      !health ||
      now - Date.parse(health.synced_at) > 6 * 3600000 ||
      !health.coverage_from ||
      Date.parse(health.coverage_from) > now - 3600000 ||
      !health.coverage_until ||
      Date.parse(health.coverage_until) < now + 3600000
    )
      return { events: [], available: false };
    const { data, error } = await admin
      .from("economic_events")
      .select("*")
      .eq("data_source", "verified")
      .gte("scheduled_at", health.coverage_from)
      .lte("scheduled_at", health.coverage_until)
      .order("scheduled_at");
    if (error) throw new Error(error.message);
    return { events: (data ?? []).map(mapRowToEvent), available: true };
  } catch {
    return { events: [], available: false };
  }
}
export async function getEconomicEvents(): Promise<EconomicEvent[]> {
  return (await getCalendarSnapshot()).events;
}
