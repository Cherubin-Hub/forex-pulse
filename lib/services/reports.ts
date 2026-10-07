import type { SessionReport } from "@/types/report";
import { MOCK_REPORTS } from "@/lib/mock/reports";

/**
 * Controller service to retrieve all session reports.
 * Ready to connect with Supabase / AI generation endpoints in the future.
 */
export async function getSessionReports(): Promise<SessionReport[]> {
  // Simulating async data fetching
  return MOCK_REPORTS;
}

export async function getLatestReport(): Promise<SessionReport | null> {
  const reports = await getSessionReports();
  return reports[0] ?? null;
}
