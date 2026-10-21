"use server";
import { requireUserId } from "@/lib/auth/user";
import { getCalendarSnapshot } from "@/lib/services/calendar";

export async function syncEconomicCalendarAction(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    await requireUserId();
    const snapshot = await getCalendarSnapshot();
    return snapshot.available
      ? { success: true, message: "Calendar refreshed from verified releases." }
      : {
          success: false,
          error:
            "Verified calendar feed is unavailable or stale. Configure the macro feed importer.",
        };
  } catch {
    return { success: false, error: "Unauthorized" };
  }
}
export async function triggerEconomicReleaseAction(
  _eventId: string,
  _customActual?: string,
): Promise<{ success: boolean; error: string }> {
  void _eventId;
  void _customActual;
  return {
    success: false,
    error:
      "Manual release simulation is disabled. Actuals must come from the verified macro feed.",
  };
}
