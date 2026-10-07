import type { TradingSetup } from "@/types/setup";

export interface SetupAnalytics {
  totalTrades: number;
  completedTrades: number;
  wins: number;
  losses: number;
  invalidated: number;
  winRate: number; // percentage (0 - 100)
  avgRiskReward: number;
  netR: number; // Sum of R-multiples: +R for TP_REACHED, -1R for SL_HIT
  profitFactor: number;
}

/**
 * Calculates quantitative performance metrics from an array of trading setups.
 */
export function calculateSetupAnalytics(setups: TradingSetup[]): SetupAnalytics {
  const totalTrades = setups.length;
  
  const wins = setups.filter((s) => s.status === "TP_REACHED").length;
  const losses = setups.filter((s) => s.status === "SL_HIT").length;
  const invalidated = setups.filter((s) => s.status === "INVALIDATED" || s.status === "EXPIRED").length;
  
  const completedTrades = wins + losses;
  const winRate = completedTrades > 0 ? (wins / completedTrades) * 100 : 0;

  // Average R:R across all logged setups
  const totalRR = setups.reduce((acc, s) => acc + s.riskReward, 0);
  const avgRiskReward = totalTrades > 0 ? totalRR / totalTrades : 0;

  // Net R calculation:
  // Win gains = setup.riskReward (R)
  // Loss = -1.0 R
  const grossProfitR = setups
    .filter((s) => s.status === "TP_REACHED")
    .reduce((acc, s) => acc + s.riskReward, 0);

  const grossLossR = losses * 1.0; // 1R per loss
  const netR = grossProfitR - grossLossR;

  // Profit Factor = Gross Profit R / Gross Loss R
  const profitFactor = grossLossR > 0 
    ? grossProfitR / grossLossR 
    : grossProfitR > 0 ? grossProfitR : 0;

  return {
    totalTrades,
    completedTrades,
    wins,
    losses,
    invalidated,
    winRate: Number(winRate.toFixed(1)),
    avgRiskReward: Number(avgRiskReward.toFixed(2)),
    netR: Number(netR.toFixed(1)),
    profitFactor: Number(profitFactor.toFixed(2)),
  };
}
