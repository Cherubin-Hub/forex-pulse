import type { TradingSetup, TradeDirection } from "@/types/setup";

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

export interface TagPerformance {
  tag: string;
  totalTrades: number;
  completedTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  netR: number;
  expectancyR: number;
  profitFactor: number;
}

export interface DimensionPerformance {
  key: string;
  totalTrades: number;
  completedTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  netR: number;
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

  const totalRR = setups.reduce((acc, s) => acc + s.riskReward, 0);
  const avgRiskReward = totalTrades > 0 ? totalRR / totalTrades : 0;

  const grossProfitR = setups
    .filter((s) => s.status === "TP_REACHED")
    .reduce((acc, s) => acc + s.riskReward, 0);

  const grossLossR = losses * 1.0;
  const netR = grossProfitR - grossLossR;

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

/**
 * Aggregates performance statistics across individual confluence tags.
 */
export function calculateTagAnalytics(setups: TradingSetup[]): TagPerformance[] {
  const tagMap: Record<
    string,
    { total: number; wins: number; losses: number; grossProfitR: number; grossLossR: number }
  > = {};

  for (const s of setups) {
    for (const tag of s.confluenceTags) {
      if (!tagMap[tag]) {
        tagMap[tag] = { total: 0, wins: 0, losses: 0, grossProfitR: 0, grossLossR: 0 };
      }
      tagMap[tag].total += 1;

      if (s.status === "TP_REACHED") {
        tagMap[tag].wins += 1;
        tagMap[tag].grossProfitR += Number(s.riskReward);
      } else if (s.status === "SL_HIT") {
        tagMap[tag].losses += 1;
        tagMap[tag].grossLossR += 1.0;
      }
    }
  }

  return Object.entries(tagMap)
    .map(([tag, data]) => {
      const completed = data.wins + data.losses;
      const winRate = completed > 0 ? (data.wins / completed) * 100 : 0;
      const netR = data.grossProfitR - data.grossLossR;
      const expectancyR = completed > 0 ? netR / completed : 0;
      const profitFactor = data.grossLossR > 0
        ? data.grossProfitR / data.grossLossR
        : data.grossProfitR > 0 ? data.grossProfitR : 0;

      return {
        tag,
        totalTrades: data.total,
        completedTrades: completed,
        wins: data.wins,
        losses: data.losses,
        winRate: Number(winRate.toFixed(1)),
        netR: Number(netR.toFixed(1)),
        expectancyR: Number(expectancyR.toFixed(2)),
        profitFactor: Number(profitFactor.toFixed(2)),
      };
    })
    .sort((a, b) => b.netR - a.netR);
}

/**
 * Aggregates performance statistics by trade direction (LONG vs SHORT) or by currency pair.
 */
export function calculateDimensionAnalytics(
  setups: TradingSetup[],
  dimension: "DIRECTION" | "SYMBOL"
): DimensionPerformance[] {
  const groups: Record<string, { total: number; wins: number; losses: number; grossProfitR: number; grossLossR: number }> = {};

  for (const s of setups) {
    const key = dimension === "DIRECTION" ? s.direction : s.symbol;
    if (!groups[key]) {
      groups[key] = { total: 0, wins: 0, losses: 0, grossProfitR: 0, grossLossR: 0 };
    }

    groups[key].total += 1;
    if (s.status === "TP_REACHED") {
      groups[key].wins += 1;
      groups[key].grossProfitR += Number(s.riskReward);
    } else if (s.status === "SL_HIT") {
      groups[key].losses += 1;
      groups[key].grossLossR += 1.0;
    }
  }

  return Object.entries(groups)
    .map(([key, data]) => {
      const completed = data.wins + data.losses;
      const winRate = completed > 0 ? (data.wins / completed) * 100 : 0;
      const netR = data.grossProfitR - data.grossLossR;

      return {
        key,
        totalTrades: data.total,
        completedTrades: completed,
        wins: data.wins,
        losses: data.losses,
        winRate: Number(winRate.toFixed(1)),
        netR: Number(netR.toFixed(1)),
      };
    })
    .sort((a, b) => b.netR - a.netR);
}
