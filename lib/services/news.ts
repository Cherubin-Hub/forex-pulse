import type { NewsArticle } from "@/types/news";
import { MOCK_NEWS } from "@/lib/mock/news";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapRowToNews } from "@/lib/supabase/mappers";

/**
 * Single entry point for market news feed.
 * Queries Supabase first; falls back to mock news if offline or database empty.
 */
export async function getNews(): Promise<NewsArticle[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("market_news")
      .select("*")
      .order("published_at", { ascending: false });

    if (error || !data || data.length === 0) {
      if (error) console.warn("Supabase market news query error, using mock fallback:", error.message);
      return [...MOCK_NEWS].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    }

    return data.map(mapRowToNews);
  } catch (err) {
    console.warn("Supabase client unavailable, using mock news fallback:", err instanceof Error ? err.message : err);
    return [...MOCK_NEWS].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }
}
