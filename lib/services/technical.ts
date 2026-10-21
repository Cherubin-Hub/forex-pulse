import { MOCK_TECHNICALS } from "@/lib/mock/technical";
import { isDemoMode } from "@/lib/marketQuality";
import { getFinnhubTechnicalAnalysis } from "@/lib/services/finnhub";
import type { TechnicalAnalysis } from "@/types/technical";
export async function getTechnicalAnalysis(): Promise<TechnicalAnalysis[]> {
  return isDemoMode()
    ? MOCK_TECHNICALS.map((value) => ({ ...value, status: "MOCK" as const }))
    : getFinnhubTechnicalAnalysis();
}
