"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/user";
import {
  savePostMortemReview,
  getPostMortems,
  syncLocalStoragePostMortems,
} from "@/lib/services/postMortems";
import type { TradePostMortem } from "@/lib/postMortemUtils";

/**
 * Server action to retrieve trade post-mortems for a user.
 */
export async function getPostMortemsAction(
  userId?: string,
): Promise<Record<string, TradePostMortem>> {
  try {
    const targetUserId = userId ?? (await requireUserId());
    return await getPostMortems(targetUserId);
  } catch {
    return {};
  }
}

/**
 * Server action to save a trade post-mortem review with Supabase persistence.
 */
export async function saveTradePostMortemAction(
  review: TradePostMortem,
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireUserId();
    const result = await savePostMortemReview(review, userId);
    revalidatePath("/", "layout");
    return result;
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to save post-mortem",
    };
  }
}

/**
 * Server action to sync offline local post-mortems to Supabase.
 */
export async function syncPostMortemsAction(
  userId?: string,
): Promise<{ success: boolean; syncedCount: number }> {
  try {
    const targetUserId = userId ?? (await requireUserId());
    const count = await syncLocalStoragePostMortems(targetUserId);
    revalidatePath("/", "layout");
    return { success: true, syncedCount: count };
  } catch {
    return { success: false, syncedCount: 0 };
  }
}
