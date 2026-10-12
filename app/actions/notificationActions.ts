"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { NotificationType, NotificationPriority } from "@/types/notification";

export interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Marks a single notification as read in Supabase.
 */
export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);

    if (error) {
      console.warn("Failed to mark notification read:", error.message);
      return { success: false, error: error.message };
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Marks all notifications as read in Supabase.
 */
export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("read", false);

    if (error) {
      console.warn("Failed to mark all notifications read:", error.message);
      return { success: false, error: error.message };
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Deletes or permanently dismisses a notification.
 */
export async function deleteNotificationAction(id: string): Promise<ActionResult> {
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id);

    if (error) {
      console.warn("Failed to delete notification:", error.message);
      return { success: false, error: error.message };
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Broadcasts or inserts a new notification into Supabase.
 */
export async function pushNotificationAction(params: {
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  symbol?: string;
  linkHref?: string;
  actionLabel?: string;
}): Promise<ActionResult> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("notifications")
      .insert({
        user_id: user?.id ?? null,
        type: params.type,
        priority: params.priority,
        title: params.title,
        message: params.message,
        symbol: params.symbol ?? null,
        link_href: params.linkHref ?? null,
        action_label: params.actionLabel ?? null,
        read: false,
      });

    if (error) {
      console.warn("Failed to push notification:", error.message);
      return { success: false, error: error.message };
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}
