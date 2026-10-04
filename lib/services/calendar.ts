import type { EconomicEvent } from "@/types/calendar";
import { MOCK_EVENTS } from "@/lib/mock/events";

/**
 * Single entry point for economic calendar data.
 * Phase 1 later: replace MOCK_EVENTS with a real calendar provider.
 */
export async function getEconomicEvents(): Promise<EconomicEvent[]> {
  return [...MOCK_EVENTS].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );
}
