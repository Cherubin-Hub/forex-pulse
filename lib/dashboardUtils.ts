import type { PriceQuote } from "@/types/market";

export type MarketMover = {
  symbol: string;
  changePercent: number;
  currentPrice: number;
};

export type MarketMoversSummary = {
  topGainer: MarketMover | null;
  topDecliner: MarketMover | null;
  mostVolatile: { symbol: string; spreadPercent: number } | null;
  aggregateUsdBias: "BULLISH" | "BEARISH" | "MIXED";
};

/**
 * Computes 24h gainers, decliners, volatility spreads, and overall USD directional bias.
 */
export function calculateMarketMovers(quotes: PriceQuote[]): MarketMoversSummary {
  const validQuotes = quotes.filter((q) => q.price !== null && q.previousClose !== null && q.previousClose > 0);

  if (validQuotes.length === 0) {
    return {
      topGainer: null,
      topDecliner: null,
      mostVolatile: null,
      aggregateUsdBias: "MIXED",
    };
  }

  const movers: MarketMover[] = validQuotes.map((q) => {
    const price = q.price!;
    const prev = q.previousClose!;
    const changePercent = Number((((price - prev) / prev) * 100).toFixed(2));
    return { symbol: q.symbol, changePercent, currentPrice: price };
  });

  const sorted = [...movers].sort((a, b) => b.changePercent - a.changePercent);
  const topGainer = sorted[0]?.changePercent > 0 ? sorted[0] : null;
  const topDecliner = sorted[sorted.length - 1]?.changePercent < 0 ? sorted[sorted.length - 1] : null;

  // Compute highest volatility range: (high - low) / price * 100
  let mostVolatile: { symbol: string; spreadPercent: number } | null = null;
  let maxSpread = 0;

  for (const q of validQuotes) {
    if (q.high !== null && q.low !== null && q.price !== null && q.price > 0) {
      const spreadPercent = Number((((q.high - q.low) / q.price) * 100).toFixed(2));
      if (spreadPercent > maxSpread) {
        maxSpread = spreadPercent;
        mostVolatile = { symbol: q.symbol, spreadPercent };
      }
    }
  }

  // Aggregate USD bias calculation
  let usdBullishScore = 0;
  let usdBearishScore = 0;

  for (const m of movers) {
    // If USD is quote (EURUSD, GBPUSD, AUDUSD, NZDUSD, XAUUSD): negative change means USD is stronger
    if (["EURUSD", "GBPUSD", "AUDUSD", "NZDUSD", "XAUUSD"].includes(m.symbol)) {
      if (m.changePercent < 0) usdBullishScore += 1;
      else if (m.changePercent > 0) usdBearishScore += 1;
    }
    // If USD is base (USDJPY, USDCAD, USDCHF): positive change means USD is stronger
    if (["USDJPY", "USDCAD", "USDCHF"].includes(m.symbol)) {
      if (m.changePercent > 0) usdBullishScore += 1;
      else if (m.changePercent < 0) usdBearishScore += 1;
    }
  }

  let aggregateUsdBias: "BULLISH" | "BEARISH" | "MIXED" = "MIXED";
  if (usdBullishScore >= usdBearishScore + 2) aggregateUsdBias = "BULLISH";
  else if (usdBearishScore >= usdBullishScore + 2) aggregateUsdBias = "BEARISH";

  return {
    topGainer,
    topDecliner,
    mostVolatile,
    aggregateUsdBias,
  };
}
