import type { ScannerFilterConfig } from "@/types/scanner";
export function resolveScannerConfig(
  input: Partial<ScannerFilterConfig> = {},
): ScannerFilterConfig {
  const traderProfile = input.traderProfile ?? "DAY_TRADER";
  const baseline =
    traderProfile === "SCALPER"
      ? { minConfluenceScore: 60, minRiskReward: 1.5 }
      : traderProfile === "SWING_TRADER"
        ? { minConfluenceScore: 75, minRiskReward: 2.5 }
        : { minConfluenceScore: 70, minRiskReward: 2 };
  return {
    ...baseline,
    enableNewsFilter: true,
    autoCommit: false,
    mode: "MANUAL",
    scanIntervalSeconds: 60,
    ...input,
    traderProfile,
    minConfluenceScore: input.minConfluenceScore ?? baseline.minConfluenceScore,
    minRiskReward: input.minRiskReward ?? baseline.minRiskReward,
  };
}
