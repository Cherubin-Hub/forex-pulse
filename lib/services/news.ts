import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapRowToNews } from "@/lib/supabase/mappers";
import type { NewsArticle } from "@/types/news";
export async function getNews(): Promise<NewsArticle[]> {
  try {
    const { data, error } = await createAdminClient()
      .from("market_news")
      .select("*")
      .eq("data_source", "verified")
      .gte("published_at", new Date(Date.now() - 48 * 3600000).toISOString())
      .order("published_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRowToNews);
  } catch {
    return [];
  }
}
