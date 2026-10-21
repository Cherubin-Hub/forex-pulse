import { MOCK_TECHNICALS } from "@/lib/mock/technical";
import { isDemoMode } from "@/lib/marketQuality";
import { getFinnhubTechnicalAnalysis } from "@/lib/services/finnhub";
import { getYahooTechnicalAnalysis } from "@/lib/services/yahooFinance";
import type { TechnicalAnalysis } from "@/types/technical";

export async function getTechnicalAnalysis(): Promise<TechnicalAnalysis[]> {
  if (isDemoMode()) {
    return MOCK_TECHNICALS.map((value) => ({
      ...value,
      status: "MOCK" as const,
    }));
  }

  try {
    const yahooTechnicals = await getYahooTechnicalAnalysis();
    if (yahooTechnicals.length > 0) {
      return yahooTechnicals;
    }
  } catch {
    // Fallback to Finnhub if Yahoo fails
  }

  return getFinnhubTechnicalAnalysis();
}
