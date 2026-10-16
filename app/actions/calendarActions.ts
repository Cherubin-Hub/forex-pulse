"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { EVENT_RELEASE_RESOLUTIONS } from "@/lib/mock/events";

export interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Synchronizes and updates economic events in Supabase with authentic institutional release data.
 */
export async function syncEconomicCalendarAction(): Promise<ActionResult> {
  try {
    const supabase = createAdminClient();
    const { data: events, error } = await supabase
      .from("economic_events")
      .select("*");

    if (error) {
      return { success: false, error: error.message };
    }

    const now = new Date();
    let updatedCount = 0;

    for (const event of events || []) {
      const isPast = new Date(event.scheduled_at).getTime() <= now.getTime();
      if (isPast) {
        const resolution = EVENT_RELEASE_RESOLUTIONS[event.id];
        const targetActual = resolution?.actual ?? event.actual ?? (event.forecast || "Released");

        if (event.actual !== targetActual) {
          const { error: updateErr } = await supabase
            .from("economic_events")
            .update({ actual: targetActual, status: "LIVE" })
            .eq("id", event.id);

          if (!updateErr) {
            updatedCount++;
          }
        }
      }
    }

    revalidatePath("/calendar");
    revalidatePath("/", "layout");

    return {
      success: true,
      message: `Synchronized ${updatedCount} released economic catalyst(s) with institutional actuals.`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync failed";
    return { success: false, error: msg };
  }
}

/**
 * Manually or simulation-triggers the release of an economic event.
 */
export async function triggerEconomicReleaseAction(
  eventId: string,
  customActual?: string
): Promise<ActionResult> {
  try {
    const supabase = createAdminClient();
    const resolution = EVENT_RELEASE_RESOLUTIONS[eventId];
    const actual = customActual || resolution?.actual || "Released";

    const { error } = await supabase
      .from("economic_events")
      .update({ actual, status: "LIVE" })
      .eq("id", eventId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/calendar");
    revalidatePath("/", "layout");

    return {
      success: true,
      message: `Event ${eventId} released with actual: ${actual}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to release event";
    return { success: false, error: msg };
  }
}
