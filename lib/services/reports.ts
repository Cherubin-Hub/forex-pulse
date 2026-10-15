import type { SessionReport } from "@/types/report";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapRowToReport } from "@/lib/supabase/mappers";

/**
 * Controller service to retrieve all session reports.
 * Queries Supabase first; returns empty array if empty or offline.
 */
export async function getSessionReports(): Promise<SessionReport[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("session_reports")
      .select("*")
      .order("timestamp", { ascending: false });

    if (error || !data || data.length === 0) {
      if (error) console.warn("Supabase reports query error:", error.message);
      return [];
    }

    return data.map(mapRowToReport);
  } catch (err) {
    console.warn("Supabase client unavailable for session reports:", err instanceof Error ? err.message : err);
    return [];
  }
}

export async function getLatestReport(): Promise<SessionReport | null> {
  const reports = await getSessionReports();
  return reports[0] ?? null;
}
