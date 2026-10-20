import type { TechnicalAnalysis, ConfluenceScore, PivotLevels, TrendDirection } from "@/types/technical";
import type { PriceQuote } from "@/types/market";
import type { TraderProfile } from "@/lib/schemas/settings";
import { INSTRUMENTS } from "@/lib/constants/instruments";

/**
 * Computes a weighted multi-timeframe trend alignment score tailored to the trader profile:
 * - SCALPER: Prioritizes M15 (50%) & H1 (35%) with H4 context (15%). D1 ignored.
 * - DAY_TRADER: Balanced intraday focus on H1 (40%), H4 (35%), M15 (15%), D1 (10%).
 * - SWING_TRADER: Macro structure focus on D1 (45%), H4 (35%), H1 (15%), M15 (5%).
 */
export function calculateConfluenceScore(
  tech: TechnicalAnalysis,
  profile: TraderProfile = "DAY_TRADER"
): ConfluenceScore {
  let weights: Record<"D1" | "H4" | "H1" | "M15", number>;
  let minThreshold = 0.52;

  switch (profile) {
    case "SCALPER":
      weights = { M15: 0.50, H1: 0.35, H4: 0.15, D1: 0.00 };
      minThreshold = 0.48;
      break;
    case "SWING_TRADER":
      weights = { D1: 0.45, H4: 0.35, H1: 0.15, M15: 0.05 };
      minThreshold = 0.55;
      break;
    case "DAY_TRADER":
    default:
      weights = { H1: 0.40, H4: 0.35, M15: 0.15, D1: 0.10 };
      minThreshold = 0.52;
      break;
  }

  let bullishWeight = 0;
  let bearishWeight = 0;

  for (const [tfKey, weight] of Object.entries(weights)) {
    if (weight === 0) continue;
    const tf = tfKey as keyof typeof weights;
    const data = tech.timeframes[tf];
    if (!data) continue;

    // Evaluate EMA trend and MACD alignment
    if (data.emaTrend === "BULLISH") bullishWeight += weight * 0.6;
    else if (data.emaTrend === "BEARISH") bearishWeight += weight * 0.6;

    if (data.macd === "BULLISH") bullishWeight += weight * 0.4;
    else if (data.macd === "BEARISH") bearishWeight += weight * 0.4;
  }

  let dominantTrend: TrendDirection = "NEUTRAL";
  let scorePercent = 50;
  let alignmentLabel = "Mixed / Consolidation";

  if (bullishWeight > bearishWeight && bullishWeight >= minThreshold) {
    dominantTrend = "BULLISH";
    scorePercent = Math.round(bullishWeight * 100);
    if (profile === "SCALPER") {
      alignmentLabel = scorePercent >= 75 ? "Strong Scalp Momentum" : "M15 Scalp Pullback Setup";
    } else if (profile === "SWING_TRADER") {
      alignmentLabel = scorePercent >= 80 ? "Macro Swing Bullish Trend" : "Multi-Day Retracement Active";
    } else {
      alignmentLabel = scorePercent >= 80 ? "Strong Bullish Alignment" : "Bullish Trend (Pullback Active)";
    }
  } else if (bearishWeight > bullishWeight && bearishWeight >= minThreshold) {
    dominantTrend = "BEARISH";
    scorePercent = Math.round(bearishWeight * 100);
    if (profile === "SCALPER") {
      alignmentLabel = scorePercent >= 75 ? "Strong Bearish Scalp Momentum" : "M15 Scalp Pullback Setup";
    } else if (profile === "SWING_TRADER") {
      alignmentLabel = scorePercent >= 80 ? "Macro Swing Bearish Trend" : "Multi-Day Retracement Active";
    } else {
      alignmentLabel = scorePercent >= 80 ? "Strong Bearish Alignment" : "Bearish Trend (Pullback Active)";
    }
  }

  return {
    scorePercent,
    dominantTrend,
    alignmentLabel,
  };
}

/**
 * Calculates standard Floor Trader Pivot levels and ATR-based volatility envelope.
 */
export function calculateDailyPivots(quote: PriceQuote, atrPips: number): PivotLevels {
  const symbol = quote.symbol;
  const isGold = symbol === "XAUUSD";
  const isJpy = symbol.includes("JPY");
  const pipMultiplier = isGold ? 0.1 : isJpy ? 0.01 : 0.0001;

  // Hydration-safe fallback handling for nullable quote metrics
  const close = quote.price ?? quote.previousClose ?? (isGold ? 2650 : isJpy ? 150 : 1.1);
  const high = quote.high ?? (close > 0 ? close * 1.004 : 1.0);
  const low = quote.low ?? (close > 0 ? close * 0.996 : 1.0);

  // Standard Floor Trader Pivots
  const pivot = (high + low + close) / 3;
  const r1 = 2 * pivot - low;
  const s1 = 2 * pivot - high;
  const r2 = pivot + (high - low);
  const s2 = pivot - (high - low);

  // Daily Expected ATR Volatility Range
  const atrDistance = atrPips * pipMultiplier;
  const projectedHigh = close + atrDistance;
  const projectedLow = close - atrDistance;

  const decimals = INSTRUMENTS.find((i) => i.symbol === symbol)?.decimals ?? 5;

  return {
    pivot: Number(pivot.toFixed(decimals)),
    r1: Number(r1.toFixed(decimals)),
    r2: Number(r2.toFixed(decimals)),
    s1: Number(s1.toFixed(decimals)),
    s2: Number(s2.toFixed(decimals)),
    projectedHigh: Number(projectedHigh.toFixed(decimals)),
    projectedLow: Number(projectedLow.toFixed(decimals)),
  };
}
