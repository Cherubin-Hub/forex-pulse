import type { TechnicalAnalysis } from "@/types/technical";
import { MOCK_TECHNICALS } from "@/lib/mock/technical";

export async function getTechnicalAnalysis(): Promise<TechnicalAnalysis[]> {
  return MOCK_TECHNICALS;
}
