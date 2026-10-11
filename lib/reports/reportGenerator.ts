import type { PriceQuote } from "@/types/market";
import type { EconomicEvent } from "@/types/calendar";
import type { TradingSetup } from "@/types/setup";
import type { 
  SessionType, 
  SessionReport, 
  MarketBias, 
  VolatilityExpectation, 
  KeyLevelBrief 
} from "@/types/report";

export type SynthesizedReportData = {
  title: string;
  session: SessionType;
  bias: MarketBias;
  volatility: VolatilityExpectation;
  executiveSummary: string;
  macroCatalysts: string[];
  keyLevels: KeyLevelBrief[];
  playbook: SessionReport["playbook"];
};

export function synthesizeSessionReportData(
  session: SessionType,
  quotes: PriceQuote[],
  events: EconomicEvent[],
  setups: TradingSetup[]
): SynthesizedReportData {
  // 1. Diagnose Market Bias based on USD Majors & Gold
  const eurusd = quotes.find((q) => q.symbol === "EURUSD");
  const usdjpy = quotes.find((q) => q.symbol === "USDJPY");
  const gold = quotes.find((q) => q.symbol === "XAUUSD");

  const isEurBearish = (eurusd?.price ?? 0) < (eurusd?.previousClose ?? 0);
  const isJpyBullish = (usdjpy?.price ?? 0) > (usdjpy?.previousClose ?? 0);
  const isGoldSurging = (gold?.price ?? 0) > (gold?.previousClose ?? 0);

  let bias: MarketBias = "NEUTRAL";
  if (isEurBearish && isJpyBullish) {
    bias = "BULLISH_USD";
  } else if (!isEurBearish && !isJpyBullish) {
    bias = "BEARISH_USD";
  } else if (isGoldSurging) {
    bias = "RISK_OFF";
  } else {
    bias = "RISK_ON";
  }

  // 2. Evaluate Volatility Expectation from High-Impact Events
  const today = new Date().toISOString().split("T")[0];
  const todaysEvents = events.filter((e) => e.scheduledAt.startsWith(today));
  const highImpactCount = todaysEvents.filter((e) => e.impact === "HIGH").length;

  let volatility: VolatilityExpectation = "NORMAL";
  if (highImpactCount >= 2) {
    volatility = "EXTREME";
  } else if (highImpactCount === 1) {
    volatility = "HIGH";
  } else if (todaysEvents.length === 0) {
    volatility = "LOW";
  }

  // 3. Compute Pivot Corridors for Key Pairs
  const keyPairs = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD"];
  const keyLevels: KeyLevelBrief[] = keyPairs.map((sym) => {
    const q = quotes.find((quote) => quote.symbol === sym);
    const price = q?.price ?? (sym === "XAUUSD" ? 2650 : sym === "USDJPY" ? 149.0 : 1.12);
    const isGold = sym === "XAUUSD";
    const isJpy = sym === "USDJPY";

    const spread = isGold ? 15.0 : isJpy ? 0.6 : 0.0045;
    const roundFactor = isGold ? 2 : isJpy ? 3 : 5;

    return {
      symbol: sym,
      pivot: Number(price.toFixed(roundFactor)),
      support: Number((price - spread).toFixed(roundFactor)),
      resistance: Number((price + spread).toFixed(roundFactor)),
      bias: q?.bias ?? "NEUTRAL",
    };
  });

  // 4. Formulate Macro Title & Executive Summary
  const sessionLabel = session.replace("_", " ");
  const title = `${sessionLabel}: ${bias.replace("_", " ")} Momentum & Volatility Playbook`;

  const highImpactTitles = todaysEvents
    .filter((e) => e.impact === "HIGH")
    .map((e) => `${e.currency} ${e.title}`);

  const macroCatalysts = highImpactTitles.length > 0
    ? highImpactTitles
    : [
        "Interbank Liquidity Flow across European financial centers.",
        "Bond Yield Rebalancing & Currency Reserve Adjustments.",
        "Intra-day Range Expansion targeting Asian session liquidity pools.",
      ];

  const activeSymbols = setups.map((s) => s.symbol);
  const focusPairs = activeSymbols.length > 0 ? Array.from(new Set(activeSymbols)) : ["EURUSD", "XAUUSD"];

  const executiveSummary = `Institutional briefing for ${sessionLabel}. Market structure indicates a ${bias.replace(
    "_",
    " "
  )} environment with ${volatility.toLowerCase()} volatility expectations. Traders should maintain strict discipline around pre-defined order blocks and avoid chasing breakouts ahead of high-tier releases.`;

  const riskRule = volatility === "EXTREME"
    ? "HIGH NEWS RISK: Maximum 0.5% risk per trade. Protect stops prior to scheduled data."
    : "Standard Risk: 1.0% maximum risk per setup. Minimum 1:2.0 R:R adherence required.";

  const tradeOpportunities = setups.length > 0
    ? setups.map((s) => `${s.symbol} ${s.direction} (${s.confluenceTags.join(", ")})`)
    : ["EURUSD liquidity sweep of Asian Session Lows", "XAU/USD pullback into H1 Bullish Fair Value Gap"];

  return {
    title,
    session,
    bias,
    volatility,
    executiveSummary,
    macroCatalysts,
    keyLevels,
    playbook: {
      focusPairs,
      riskRule,
      tradeOpportunities,
    },
  };
}
