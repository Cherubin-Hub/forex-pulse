import { getQuotes } from "@/lib/services/marketData";
import { getTechnicalAnalysis } from "@/lib/services/technical";
import { getEconomicEvents } from "@/lib/services/calendar";
import { getActiveSetups } from "@/lib/services/setups";
import { calculateConfluenceScore, calculateDailyPivots } from "@/lib/technicalUtils";
import { calculateRiskReward } from "@/lib/setupUtils";
import { INSTRUMENTS } from "@/lib/constants/instruments";
import type { PriceQuote } from "@/types/market";
import type { TechnicalAnalysis } from "@/types/technical";
import type { EconomicEvent } from "@/types/calendar";
import type { ScannedOpportunity, ScannerFilterConfig, ScannerRunResult, StrategyType } from "@/types/scanner";
import type { TraderProfile } from "@/lib/schemas/settings";

const DEFAULT_CONFIG: ScannerFilterConfig = {
  minConfluenceScore: 70,
  minRiskReward: 2.0,
  enableNewsFilter: true,
  autoCommit: true,
  mode: "AUTOMATIC",
  scanIntervalSeconds: 15,
  traderProfile: "DAY_TRADER",
};

/**
 * Institutional Gatekeeper: Checks if high-impact economic news is scheduled within 45 minutes.
 */
function isNewsHazard(symbol: string, events: EconomicEvent[]): boolean {
  const baseCurrency = symbol.slice(0, 3);
  const quoteCurrency = symbol.slice(3, 6);
  const now = Date.now();
  const FORTY_FIVE_MINS_MS = 45 * 60 * 1000;

  return events.some((event) => {
    if (event.impact !== "HIGH") return false;
    if (event.currency !== baseCurrency && event.currency !== quoteCurrency && event.currency !== "USD") {
      return false;
    }
    const eventTime = new Date(event.scheduledAt).getTime();
    const diff = Math.abs(eventTime - now);
    return diff <= FORTY_FIVE_MINS_MS;
  });
}

/**
 * Resolves profile-specific baseline thresholds for confluence score and minimum R:R.
 */
function getProfileBaselines(profile: TraderProfile, userConfig: ScannerFilterConfig) {
  let defaultScore: number;
  let defaultRR: number;

  switch (profile) {
    case "SCALPER":
      defaultScore = 60;
      defaultRR = 1.5;
      break;
    case "SWING_TRADER":
      defaultScore = 75;
      defaultRR = 2.5;
      break;
    case "DAY_TRADER":
    default:
      defaultScore = 70;
      defaultRR = 2.0;
      break;
  }

  const effectiveMinScore =
    userConfig.minConfluenceScore && userConfig.minConfluenceScore !== 75 && userConfig.minConfluenceScore !== 70
      ? userConfig.minConfluenceScore
      : defaultScore;

  const effectiveMinRR =
    userConfig.minRiskReward && userConfig.minRiskReward !== 2.0
      ? userConfig.minRiskReward
      : defaultRR;

  return { effectiveMinScore, effectiveMinRR };
}

/**
 * Algorithmic Engine: Evaluates a symbol tailored specifically to the trader's profile:
 * - SCALPER: Fast M15 momentum & pullbacks with tight stops (10-20 pips), 1.5R+ targets.
 * - DAY_TRADER: Intraday Pivot/S1/R1 bounces with 2.0R+ targets based on H1 ATR.
 * - SWING_TRADER: Multi-day trend continuations with 2.5R+ targets based on H4/D1 structure.
 */
function evaluateSymbol(
  quote: PriceQuote,
  tech: TechnicalAnalysis,
  events: EconomicEvent[],
  config: ScannerFilterConfig
): ScannedOpportunity | null {
  const symbol = quote.symbol;
  const price = quote.price ?? quote.previousClose ?? 0;
  if (price <= 0) return null;

  // 1. News Risk Gatekeeper Filter
  const hasNewsHazard = isNewsHazard(symbol, events);
  if (config.enableNewsFilter && hasNewsHazard) {
    return null;
  }

  const profile: TraderProfile = config.traderProfile || "DAY_TRADER";
  const { effectiveMinScore, effectiveMinRR } = getProfileBaselines(profile, config);

  // 2. Multi-Timeframe Confluence Alignment Score (Dynamic weights per profile)
  const confluence = calculateConfluenceScore(tech, profile);
  if (confluence.scorePercent < effectiveMinScore || confluence.dominantTrend === "NEUTRAL") {
    return null;
  }

  const isLong = confluence.dominantTrend === "BULLISH";
  const instrument = INSTRUMENTS.find((i) => i.symbol === symbol);
  const decimals = instrument?.decimals ?? 5;
  const isGold = symbol === "XAUUSD";
  const isJpy = symbol.includes("JPY");
  const pipMultiplier = isGold ? 0.1 : isJpy ? 0.01 : 0.0001;

  let strategy: StrategyType;
  let entryMin: number;
  let entryMax: number;
  let stopLoss: number;
  let takeProfit1: number;
  let invalidationRule: string;
  let notes: string;
  const confluenceTags: string[] = [
    `Confluence ${confluence.scorePercent}%`,
    confluence.alignmentLabel,
  ];

  // 3. Profile-Specific Strategy & Geometry Generator
  if (profile === "SCALPER") {
    strategy = "M15_MOMENTUM_SCALP";
    const scalpAtr = tech.timeframes.M15?.atr || Math.max(5, (tech.timeframes.H1.atr || 20) * 0.35);
    const scalpBuffer = scalpAtr * pipMultiplier;

    if (isLong) {
      entryMin = Number((price - scalpBuffer * 0.25).toFixed(decimals));
      entryMax = Number((price + scalpBuffer * 0.15).toFixed(decimals));
      stopLoss = Number((entryMin - scalpBuffer * 0.9).toFixed(decimals));
      takeProfit1 = Number((entryMax + scalpBuffer * 1.6).toFixed(decimals));
      invalidationRule = `M5 candle close below Stop Loss @ ${stopLoss}`;
      notes = `Scalp setup detected on M15 with ${confluence.scorePercent}% momentum confluence. Fast execution.`;
      confluenceTags.push("M15 Scalp Momentum", "Fast Execution", "Target: +1.6R Scalp");
    } else {
      entryMin = Number((price - scalpBuffer * 0.15).toFixed(decimals));
      entryMax = Number((price + scalpBuffer * 0.25).toFixed(decimals));
      stopLoss = Number((entryMax + scalpBuffer * 0.9).toFixed(decimals));
      takeProfit1 = Number((entryMin - scalpBuffer * 1.6).toFixed(decimals));
      invalidationRule = `M5 candle close above Stop Loss @ ${stopLoss}`;
      notes = `Scalp setup detected on M15 with ${confluence.scorePercent}% bearish momentum confluence. Fast execution.`;
      confluenceTags.push("M15 Scalp Momentum", "Fast Execution", "Target: +1.6R Scalp");
    }
  } else if (profile === "SWING_TRADER") {
    strategy = "SWING_STRUCTURE_BREAK";
    const atrPips = tech.timeframes.H4?.atr || tech.timeframes.D1.atr || 60;
    const pivots = calculateDailyPivots(quote, atrPips);
    const swingBuffer = atrPips * pipMultiplier;

    if (isLong) {
      const anchor = price > pivots.pivot ? pivots.pivot : pivots.s1;
      entryMin = Number((anchor - swingBuffer * 0.3).toFixed(decimals));
      entryMax = Number((anchor + swingBuffer * 0.3).toFixed(decimals));
      stopLoss = Number((Math.min(pivots.s2, entryMin - swingBuffer * 1.5)).toFixed(decimals));
      if (stopLoss >= entryMin) {
        stopLoss = Number((entryMin - swingBuffer * 1.5).toFixed(decimals));
      }
      takeProfit1 = Number((Math.max(pivots.r2, entryMax + swingBuffer * 3.2)).toFixed(decimals));
      invalidationRule = `D1 candle close below Stop Loss @ ${stopLoss}`;
      notes = `Macro swing trend on D1/H4 with ${confluence.scorePercent}% confluence. Multi-day targets.`;
      confluenceTags.push("Swing Structure Break", `Target: R2 @ ${pivots.r2}`, "Multi-Day Extension");
    } else {
      const anchor = price < pivots.pivot ? pivots.pivot : pivots.r1;
      entryMin = Number((anchor - swingBuffer * 0.3).toFixed(decimals));
      entryMax = Number((anchor + swingBuffer * 0.3).toFixed(decimals));
      stopLoss = Number((Math.max(pivots.r2, entryMax + swingBuffer * 1.5)).toFixed(decimals));
      if (stopLoss <= entryMax) {
        stopLoss = Number((entryMax + swingBuffer * 1.5).toFixed(decimals));
      }
      takeProfit1 = Number((Math.min(pivots.s2, entryMin - swingBuffer * 3.2)).toFixed(decimals));
      invalidationRule = `D1 candle close above Stop Loss @ ${stopLoss}`;
      notes = `Macro swing breakdown on D1/H4 with ${confluence.scorePercent}% confluence. Multi-day targets.`;
      confluenceTags.push("Swing Structure Breakdown", `Target: S2 @ ${pivots.s2}`, "Multi-Day Extension");
    }
  } else {
    // DAY_TRADER default
    strategy = "INTRADAY_DAY_TRADE";
    const atrPips = tech.timeframes.H1.atr || 20;
    const pivots = calculateDailyPivots(quote, atrPips);
    const atrBuffer = atrPips * pipMultiplier;

    if (isLong) {
      const anchor = price > pivots.pivot ? pivots.pivot : pivots.s1;
      entryMin = Number((anchor - atrBuffer * 0.25).toFixed(decimals));
      entryMax = Number((anchor + atrBuffer * 0.25).toFixed(decimals));
      stopLoss = Number((Math.min(pivots.s2, entryMin - atrBuffer * 1.2)).toFixed(decimals));
      if (stopLoss >= entryMin) {
        stopLoss = Number((entryMin - atrBuffer * 1.2).toFixed(decimals));
      }
      takeProfit1 = Number((Math.max(pivots.r2, entryMax + atrBuffer * 2.5)).toFixed(decimals));
      invalidationRule = `H1 candle close below Stop Loss @ ${stopLoss}`;
      notes = `Intraday Day Trade detected with ${confluence.scorePercent}% H1/H4 confluence. News risk clear.`;
      confluenceTags.push("Support Pullback Bounce", `Target: R2 @ ${pivots.r2}`);
    } else {
      const anchor = price < pivots.pivot ? pivots.pivot : pivots.r1;
      entryMin = Number((anchor - atrBuffer * 0.25).toFixed(decimals));
      entryMax = Number((anchor + atrBuffer * 0.25).toFixed(decimals));
      stopLoss = Number((Math.max(pivots.r2, entryMax + atrBuffer * 1.2)).toFixed(decimals));
      if (stopLoss <= entryMax) {
        stopLoss = Number((entryMax + atrBuffer * 1.2).toFixed(decimals));
      }
      takeProfit1 = Number((Math.min(pivots.s2, entryMin - atrBuffer * 2.5)).toFixed(decimals));
      invalidationRule = `H1 candle close above Stop Loss @ ${stopLoss}`;
      notes = `Intraday Day Trade rejection detected with ${confluence.scorePercent}% H1/H4 confluence. News risk clear.`;
      confluenceTags.push("Resistance Pullback Rejection", `Target: S2 @ ${pivots.s2}`);
    }
  }

  // 4. Risk:Reward Ratio Verification
  const avgEntry = (entryMin + entryMax) / 2;
  const calculatedRR = calculateRiskReward(isLong ? "LONG" : "SHORT", avgEntry, stopLoss, takeProfit1);

  if (calculatedRR < effectiveMinRR) {
    return null;
  }

  return {
    id: `scan-${symbol}-${Date.now()}`,
    symbol,
    direction: isLong ? "LONG" : "SHORT",
    strategy,
    entryMin,
    entryMax,
    stopLoss,
    takeProfit1,
    takeProfit2: null,
    riskReward: Number(calculatedRR.toFixed(2)),
    confluenceScore: confluence.scorePercent,
    confluenceTags,
    invalidationRule,
    notes,
    detectedAt: new Date().toISOString(),
    newsClear: !hasNewsHazard,
  };
}

/**
 * Controller Service: Orchestrates market-wide scan across all watchlist assets tailored to the trader profile.
 */
export async function scanMarketOpportunities(
  userConfig?: Partial<ScannerFilterConfig>
): Promise<ScannerRunResult> {
  const config: ScannerFilterConfig = { ...DEFAULT_CONFIG, ...userConfig };

  const [quotes, technicals, events, activeSetups] = await Promise.all([
    getQuotes(),
    getTechnicalAnalysis(),
    getEconomicEvents(),
    getActiveSetups(),
  ]);

  const activeSymbols = new Set(activeSetups.map((s) => s.symbol));
  const opportunities: ScannedOpportunity[] = [];

  for (const quote of quotes) {
    // Deduplication guard: Skip if an active setup for this symbol is already running or waiting
    if (activeSymbols.has(quote.symbol)) continue;

    const tech = technicals.find((t) => t.symbol === quote.symbol);
    if (!tech) continue;

    const opp = evaluateSymbol(quote, tech, events, config);
    if (opp) {
      opportunities.push(opp);
    }
  }

  return {
    scannedCount: quotes.length,
    opportunities,
    committedCount: 0,
    timestamp: new Date().toISOString(),
  };
}
