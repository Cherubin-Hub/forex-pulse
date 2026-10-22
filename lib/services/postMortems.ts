import type { TradePostMortem } from "@/lib/postMortemUtils";
import {
  loadAllPostMortems as loadLocalPostMortems,
  savePostMortem as saveLocalPostMortem,
} from "@/lib/postMortemUtils";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapRowToPostMortem } from "@/lib/supabase/mappers";
import type { Json } from "@/types/database";

/**
 * Controller service to retrieve all post-mortem reviews for a user.
 * Queries Supabase first, falling back gracefully to LocalStorage if offline.
 */
export async function getPostMortems(
  userId?: string,
): Promise<Record<string, TradePostMortem>> {
  if (!userId) return {};

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("trade_post_mortems")
      .select("*")
      .eq("user_id", userId)
      .order("reviewed_at", { ascending: false });

    if (error || !data || data.length === 0) {
      if (error) {
        console.warn("[PostMortems] Supabase query error, fallback to local:", error.message);
      }
      return loadLocalPostMortems(userId);
    }

    const reviews: Record<string, TradePostMortem> = {};
    for (const row of data) {
      const mapped = mapRowToPostMortem(row);
      reviews[mapped.setupId] = mapped;
    }

    return reviews;
  } catch (err) {
    console.warn(
      "[PostMortems] Cloud unavailable, reading local post-mortems:",
      err instanceof Error ? err.message : err,
    );
    return loadLocalPostMortems(userId);
  }
}

/**
 * Saves a post-mortem review both locally and into Supabase PostgreSQL.
 */
export async function savePostMortemReview(
  review: TradePostMortem,
  userId?: string,
): Promise<{ success: boolean; error?: string }> {
  // Always update local storage for offline resilience
  saveLocalPostMortem(review, userId);

  if (!userId) {
    return { success: true };
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("trade_post_mortems").upsert(
      {
        setup_id: review.setupId,
        user_id: userId,
        grade: review.grade,
        psychological_state: review.psychology,
        mistake_category: review.mistake,
        rules_followed: review.rulesFollowed as unknown as Json,
        discipline_score: review.disciplineScore,
        retrospective_notes: review.retrospectiveNotes,
        reviewed_at: review.reviewedAt,
      },
      {
        onConflict: "user_id,setup_id",
      },
    );

    if (error) {
      console.warn("[PostMortems] Supabase upsert error:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.warn(
      "[PostMortems] Failed to save review to Supabase:",
      err instanceof Error ? err.message : err,
    );
    return {
      success: true, // Local succeeded, offline mode
    };
  }
}

/**
 * Syncs any unpersisted local post-mortems to Supabase when user authenticates.
 */
export async function syncLocalStoragePostMortems(
  userId?: string,
): Promise<number> {
  if (!userId) return 0;

  try {
    const local = loadLocalPostMortems(userId);
    const keys = Object.keys(local);
    if (keys.length === 0) return 0;

    const supabase = createAdminClient();
    const records = keys.map((key) => {
      const review = local[key];
      return {
        setup_id: review.setupId,
        user_id: userId,
        grade: review.grade,
        psychological_state: review.psychology,
        mistake_category: review.mistake,
        rules_followed: review.rulesFollowed as unknown as Json,
        discipline_score: review.disciplineScore,
        retrospective_notes: review.retrospectiveNotes,
        reviewed_at: review.reviewedAt,
      };
    });

    const { error } = await supabase.from("trade_post_mortems").upsert(
      records,
      { onConflict: "user_id,setup_id" },
    );

    if (error) {
      console.warn("[PostMortems] Batch sync error:", error.message);
      return 0;
    }

    return records.length;
  } catch (err) {
    console.warn("[PostMortems] Sync failure:", err);
    return 0;
  }
}
