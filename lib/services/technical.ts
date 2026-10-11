import type { TechnicalAnalysis } from "@/types/technical";
import { MOCK_TECHNICALS } from "@/lib/mock/technical";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapRowToTechnicalAnalysis } from "@/lib/supabase/mappers";

/**
 * Controller service to retrieve multi-timeframe technical indicator analysis.
 * Queries Supabase first; falls back to deterministic mock data if empty or offline.
 */
export async function getTechnicalAnalysis(): Promise<TechnicalAnalysis[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("technical_analysis")
      .select("*");

    if (error || !data || data.length === 0) {
      if (error) console.warn("Supabase technical query error, using mock fallback:", error.message);
      return MOCK_TECHNICALS;
    }

    return data.map(mapRowToTechnicalAnalysis);
  } catch (err) {
    console.warn("Supabase client unavailable, using mock technicals fallback:", err instanceof Error ? err.message : err);
    return MOCK_TECHNICALS;
  }
}
