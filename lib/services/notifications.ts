import type { SystemNotification } from "@/types/notification";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapRowToNotification } from "@/lib/supabase/mappers";

/**
 * Single entry point for fetching notifications.
 * Queries Supabase first; returns empty array if offline or empty.
 */
export async function getNotifications(): Promise<SystemNotification[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data || data.length === 0) {
      if (error) {
        console.warn("Supabase notifications query error:", error.message);
      }
      return [];
    }

    return data.map(mapRowToNotification);
  } catch (err) {
    console.warn(
      "Supabase client unavailable for notifications:",
      err instanceof Error ? err.message : err
    );
    return [];
  }
}

/**
 * Creates and persists a new system notification in Supabase.
 */
export async function createNotification(
  notification: Omit<SystemNotification, "id" | "timestamp">
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: notification.userId ?? null,
        type: notification.type,
        priority: notification.priority,
        title: notification.title,
        message: notification.message,
        symbol: notification.symbol ?? null,
        link_href: notification.linkHref ?? null,
        action_label: notification.actionLabel ?? null,
        read: notification.read ?? false,
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, id: data.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create notification",
    };
  }
}
