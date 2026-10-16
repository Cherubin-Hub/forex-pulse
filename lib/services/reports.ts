import type { SessionReport } from "@/types/report";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapRowToReport } from "@/lib/supabase/mappers";
import { getAuthenticatedUserId } from "@/lib/auth/user";

/**
 * Controller service to retrieve all session reports.
 * Scoped specifically to the authenticated user.
 */
export async function getSessionReports(): Promise<SessionReport[]> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return [];

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("session_reports")
      .select("*")
      .eq("playbook->>userId", userId)
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
