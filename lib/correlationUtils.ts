import type { PriceQuote } from "@/types/market";
import { INSTRUMENTS } from "@/lib/constants/instruments";
import { calculateChange } from "@/lib/formatters";

export type CurrencyStrength = {
  currency: string;
  score: number; // Raw relative momentum score
  normalizedScore: number; // -10.0 to +10.0
  barPercentage: number; // 0% to 100% for UI rendering
  bias: "STRONG" | "BULLISH" | "NEUTRAL" | "BEARISH" | "WEAK";
};

export type MacroDivergence = {
  strongest: CurrencyStrength;
  weakest: CurrencyStrength;
  divergenceSpread: number;
  recommendedPair: string;
  rationale: string;
};

export type CorrelationCell = {
  symbolA: string;
  symbolB: string;
  coefficient: number; // -1.00 to +1.00
  intensity: "STRONG_POS" | "MODERATE_POS" | "NEUTRAL" | "MODERATE_NEG" | "STRONG_NEG";
  riskAdvice: string;
};

const MAJOR_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF"] as const;

/**
 * Calculates Pearson correlation coefficient between two series of numbers.
 */
export function calculatePearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (denominator === 0) return 0;

  return Number((numerator / denominator).toFixed(2));
}

/**
 * Computes Relative Currency Strength across the 8 major currencies based on intraday performance.
 */
export function calculateCurrencyStrengths(quotes: PriceQuote[]): {
  strengths: CurrencyStrength[];
  divergence: MacroDivergence | null;
} {
  const currencyScores: Record<string, number> = {};
  for (const c of MAJOR_CURRENCIES) currencyScores[c] = 0;

  for (const q of quotes) {
    if (q.symbol === "XAUUSD") continue; // Exclude commodity gold from currency baskets
    const inst = INSTRUMENTS.find((i) => i.symbol === q.symbol);
    if (!inst) continue;

    const change = calculateChange(q.price, q.previousClose)?.percent ?? 0;
    // Base currency gains positive change; Quote currency gains inverse
    currencyScores[inst.base] = (currencyScores[inst.base] ?? 0) + change;
    currencyScores[inst.quote] = (currencyScores[inst.quote] ?? 0) - change;
  }

  // Find max absolute value to normalize scores on a -10 to +10 scale
  const scores = Object.values(currencyScores);
  const maxAbs = Math.max(0.1, ...scores.map(Math.abs));

  const strengths: CurrencyStrength[] = Object.entries(currencyScores).map(([currency, score]) => {
    const normalizedScore = Number(((score / maxAbs) * 10).toFixed(1));
    const barPercentage = Math.round(((normalizedScore + 10) / 20) * 100);

    let bias: CurrencyStrength["bias"] = "NEUTRAL";
    if (normalizedScore >= 6.0) bias = "STRONG";
    else if (normalizedScore >= 2.0) bias = "BULLISH";
    else if (normalizedScore <= -6.0) bias = "WEAK";
    else if (normalizedScore <= -2.0) bias = "BEARISH";

    return {
      currency,
      score: Number(score.toFixed(2)),
      normalizedScore,
      barPercentage,
      bias,
    };
  });

  strengths.sort((a, b) => b.normalizedScore - a.normalizedScore);

  // Identify Top Macro Divergence
  let divergence: MacroDivergence | null = null;
  if (strengths.length >= 2) {
    const strongest = strengths[0];
    const weakest = strengths[strengths.length - 1];
    const spread = Number((strongest.normalizedScore - weakest.normalizedScore).toFixed(1));

    // Try finding matching tradeable pair
    let recommendedPair = `${strongest.currency}${weakest.currency}`;
    const exists = INSTRUMENTS.some((i) => i.symbol === recommendedPair);
    if (!exists) {
      recommendedPair = `${weakest.currency}${strongest.currency}`;
    }

    divergence = {
      strongest,
      weakest,
      divergenceSpread: spread,
      recommendedPair,
      rationale: `Strongest currency ${strongest.currency} (+${strongest.normalizedScore}) vs Weakest ${weakest.currency} (${weakest.normalizedScore}) creates maximum directional edge on ${recommendedPair}.`,
    };
  }

  return { strengths, divergence };
}

/**
 * Builds the complete pairwise correlation matrix between tracked instruments.
 */
export function buildCorrelationMatrix(quotes: PriceQuote[]): {
  symbols: string[];
  matrix: CorrelationCell[][];
} {
  const filtered = quotes.filter((q) => q.sparkline && q.sparkline.length >= 5);
  const symbols = filtered.map((q) => q.symbol);

  const matrix: CorrelationCell[][] = [];

  for (let i = 0; i < filtered.length; i++) {
    const row: CorrelationCell[] = [];
    const quoteA = filtered[i];

    for (let j = 0; j < filtered.length; j++) {
      const quoteB = filtered[j];

      let coefficient = 1.0;
      if (i !== j) {
        coefficient = calculatePearsonCorrelation(quoteA.sparkline, quoteB.sparkline);
      }

      let intensity: CorrelationCell["intensity"] = "NEUTRAL";
      let riskAdvice = "Independent price action. Low correlation risk.";

      if (coefficient >= 0.7) {
        intensity = "STRONG_POS";
        riskAdvice = "Strong positive correlation! Avoid simultaneous same-direction trades.";
      } else if (coefficient >= 0.3) {
        intensity = "MODERATE_POS";
        riskAdvice = "Moderate positive correlation. Partial exposure overlap.";
      } else if (coefficient <= -0.7) {
        intensity = "STRONG_NEG";
        riskAdvice = "Strong inverse correlation! Positions in opposite directions duplicate risk.";
      } else if (coefficient <= -0.3) {
        intensity = "MODERATE_NEG";
        riskAdvice = "Moderate inverse correlation.";
      }

      row.push({
        symbolA: quoteA.symbol,
        symbolB: quoteB.symbol,
        coefficient,
        intensity,
        riskAdvice,
      });
    }

    matrix.push(row);
  }

  return { symbols, matrix };
}
