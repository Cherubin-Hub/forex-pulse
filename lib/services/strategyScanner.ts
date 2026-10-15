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
import type { ScannedOpportunity, ScannerFilterConfig, ScannerRunResult } from "@/types/scanner";

const DEFAULT_CONFIG: ScannerFilterConfig = {
  minConfluenceScore: 75,
  minRiskReward: 2.0,
  enableNewsFilter: true,
  autoCommit: true,
  mode: "AUTOMATIC",
  scanIntervalSeconds: 15,
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
 * Algorithmic Engine: Evaluates a symbol for MTF Trend Pullback & Continuation.
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

  // 2. Multi-Timeframe Trend & Confluence Alignment Score (D1: 35%, H4: 30%, H1: 20%, M15: 15%)
  const confluence = calculateConfluenceScore(tech);
  if (confluence.scorePercent < config.minConfluenceScore || confluence.dominantTrend === "NEUTRAL") {
    return null;
  }

  const isLong = confluence.dominantTrend === "BULLISH";
  const instrument = INSTRUMENTS.find((i) => i.symbol === symbol);
  const decimals = instrument?.decimals ?? 5;
  const isGold = symbol === "XAUUSD";
  const isJpy = symbol.includes("JPY");
  const pipMultiplier = isGold ? 0.1 : isJpy ? 0.01 : 0.0001;

  // 3. Volatility Envelope and Pivot Geometry
  const atrPips = tech.timeframes.H1.atr || 20;
  const pivots = calculateDailyPivots(quote, atrPips);
  const atrBuffer = atrPips * pipMultiplier;

  let entryMin: number;
  let entryMax: number;
  let stopLoss: number;
  let takeProfit1: number;
  const confluenceTags: string[] = [
    `Confluence ${confluence.scorePercent}%`,
    confluence.alignmentLabel,
  ];

  if (isLong) {
    // Pullback zone around Daily Pivot or Support 1
    const anchor = price > pivots.pivot ? pivots.pivot : pivots.s1;
    entryMin = Number((anchor - atrBuffer * 0.25).toFixed(decimals));
    entryMax = Number((anchor + atrBuffer * 0.25).toFixed(decimals));

    // Stop Loss safely below structural S2 or 1.2x ATR
    stopLoss = Number((Math.min(pivots.s2, entryMin - atrBuffer * 1.2)).toFixed(decimals));
    if (stopLoss >= entryMin) {
      stopLoss = Number((entryMin - atrBuffer * 1.2).toFixed(decimals));
    }

    // Take Profit targeting Resistance 2
    takeProfit1 = Number((Math.max(pivots.r2, entryMax + atrBuffer * 2.5)).toFixed(decimals));
    if (takeProfit1 <= entryMax) {
      takeProfit1 = Number((entryMax + atrBuffer * 2.5).toFixed(decimals));
    }

    confluenceTags.push("Support Pullback Bounce", `Target: R2 @ ${pivots.r2}`);
  } else {
    // Rally rejection zone around Daily Pivot or Resistance 1
    const anchor = price < pivots.pivot ? pivots.pivot : pivots.r1;
    entryMin = Number((anchor - atrBuffer * 0.25).toFixed(decimals));
    entryMax = Number((anchor + atrBuffer * 0.25).toFixed(decimals));

    // Stop Loss safely above structural R2 or 1.2x ATR
    stopLoss = Number((Math.max(pivots.r2, entryMax + atrBuffer * 1.2)).toFixed(decimals));
    if (stopLoss <= entryMax) {
      stopLoss = Number((entryMax + atrBuffer * 1.2).toFixed(decimals));
    }

    // Take Profit targeting Support 2
    takeProfit1 = Number((Math.min(pivots.s2, entryMin - atrBuffer * 2.5)).toFixed(decimals));
    if (takeProfit1 >= entryMin) {
      takeProfit1 = Number((entryMin - atrBuffer * 2.5).toFixed(decimals));
    }

    confluenceTags.push("Resistance Pullback Rejection", `Target: S2 @ ${pivots.s2}`);
  }

  // 4. Strict Risk:Reward Ratio Verification
  const avgEntry = (entryMin + entryMax) / 2;
  const calculatedRR = calculateRiskReward(isLong ? "LONG" : "SHORT", avgEntry, stopLoss, takeProfit1);

  if (calculatedRR < config.minRiskReward) {
    return null;
  }

  return {
    id: `scan-${symbol}-${Date.now()}`,
    symbol,
    direction: isLong ? "LONG" : "SHORT",
    strategy: "MTF_TREND_PULLBACK",
    entryMin,
    entryMax,
    stopLoss,
    takeProfit1,
    takeProfit2: null,
    riskReward: Number(calculatedRR.toFixed(2)),
    confluenceScore: confluence.scorePercent,
    confluenceTags,
    invalidationRule: isLong
      ? `H1 candle close below Stop Loss @ ${stopLoss}`
      : `H1 candle close above Stop Loss @ ${stopLoss}`,
    notes: `Automated scanner detected ${confluence.dominantTrend} setup with ${confluence.scorePercent}% MTF confluence. News risk clear.`,
    detectedAt: new Date().toISOString(),
    newsClear: !hasNewsHazard,
  };
}

/**
 * Controller Service: Orchestrates market-wide scan across all watchlist assets.
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
