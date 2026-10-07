import type { SessionReport } from "@/types/report";
import { MOCK_REPORTS } from "@/lib/mock/reports";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapRowToReport } from "@/lib/supabase/mappers";

/**
 * Controller service to retrieve all session reports.
 * Queries Supabase first; falls back to mock data if empty or offline.
 */
export async function getSessionReports(): Promise<SessionReport[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("session_reports")
      .select("*")
      .order("timestamp", { ascending: false });

    if (error || !data || data.length === 0) {
      if (error) console.warn("Supabase reports query error, using mock fallback:", error.message);
      return MOCK_REPORTS;
    }

    return data.map(mapRowToReport);
  } catch (err) {
    console.warn("Supabase client unavailable, using mock reports fallback:", err instanceof Error ? err.message : err);
    return MOCK_REPORTS;
  }
}

export async function getLatestReport(): Promise<SessionReport | null> {
  const reports = await getSessionReports();
  return reports[0] ?? null;
}
