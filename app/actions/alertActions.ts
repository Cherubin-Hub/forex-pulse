"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/user";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapRowToPriceAlert } from "@/lib/supabase/mappers";
import type { PriceAlert } from "@/types/alert";

/**
 * Retrieves all price alerts configured for the current authenticated user.
 */
export async function getUserPriceAlertsAction(): Promise<PriceAlert[]> {
  try {
    const userId = await requireUserId();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("price_alerts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map(mapRowToPriceAlert);
  } catch {
    return [];
  }
}

/**
 * Saves or updates a price alert in Supabase.
 */
export async function savePriceAlertAction(
  alert: PriceAlert,
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireUserId();
    const supabase = createAdminClient();

    // Check if ID is a client-generated timestamp ID
    const isClientTempId =
      alert.id.startsWith("alert-") || !alert.id.includes("-");

    const payload = {
      ...(isClientTempId ? {} : { id: alert.id }),
      user_id: userId,
      setup_id: alert.setupId,
      symbol: alert.symbol,
      condition: alert.condition,
      target_price: alert.targetPrice,
      proximity_pips: alert.proximityPips ?? null,
      action: alert.action,
      status: alert.status,
      message: alert.message,
      fired_at: alert.firedAt,
    };

    const { error } = await supabase.from("price_alerts").upsert(payload);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save alert",
    };
  }
}

/**
 * Deletes a price alert owned by the user.
 */
export async function deletePriceAlertAction(
  alertId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireUserId();
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("price_alerts")
      .delete()
      .eq("id", alertId)
      .eq("user_id", userId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete alert",
    };
  }
}

/**
 * Syncs an array of offline local alerts to Supabase.
 */
export async function syncPriceAlertsAction(
  alerts: PriceAlert[],
): Promise<{ success: boolean; syncedCount: number }> {
  try {
    const userId = await requireUserId();
    if (alerts.length === 0) return { success: true, syncedCount: 0 };

    const supabase = createAdminClient();
    const records = alerts.map((alert) => ({
      user_id: userId,
      setup_id: alert.setupId,
      symbol: alert.symbol,
      condition: alert.condition,
      target_price: alert.targetPrice,
      proximity_pips: alert.proximityPips ?? null,
      action: alert.action,
      status: alert.status,
      message: alert.message,
      fired_at: alert.firedAt,
    }));

    const { error } = await supabase.from("price_alerts").insert(records);
    if (error) {
      console.warn("[AlertActions] Batch sync error:", error.message);
      return { success: false, syncedCount: 0 };
    }

    return { success: true, syncedCount: alerts.length };
  } catch {
    return { success: false, syncedCount: 0 };
  }
}
