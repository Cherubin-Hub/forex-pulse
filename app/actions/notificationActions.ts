"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUserId } from "@/lib/auth/user";
import { notificationInputSchema } from "@/lib/schemas/notification";
import type {
  NotificationType,
  NotificationPriority,
} from "@/types/notification";
export async function markNotificationReadAction(id: string) {
  try {
    const userId = await requireUserId();
    if (!z.string().uuid().safeParse(id).success)
      return {
        success: false,
        error: "Notification is local to this browser.",
      };
    const { error } = await createAdminClient()
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Update failed",
    };
  }
}
export async function markAllNotificationsReadAction() {
  try {
    const userId = await requireUserId();
    const { error } = await createAdminClient()
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
    if (error) throw new Error(error.message);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Update failed",
    };
  }
}
export async function deleteNotificationAction(id: string) {
  try {
    const userId = await requireUserId();
    z.string().uuid().parse(id);
    const { error } = await createAdminClient()
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Delete failed",
    };
  }
}
export async function pushNotificationAction(input: {
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  symbol?: string;
  linkHref?: string;
  actionLabel?: string;
}) {
  try {
    const userId = await requireUserId(),
      value = notificationInputSchema.parse(input);
    const { error } = await createAdminClient()
      .from("notifications")
      .insert({
        user_id: userId,
        type: value.type,
        priority: value.priority,
        title: value.title,
        message: value.message,
        symbol: value.symbol ?? null,
        link_href: value.linkHref ?? null,
        action_label: value.actionLabel ?? null,
        read: false,
      });
    if (error) throw new Error(error.message);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Notification failed",
    };
  }
}

export async function fetchNotificationsAction() {
  await requireUserId();
  const { getNotifications } = await import("@/lib/services/notifications");
  return getNotifications();
}
