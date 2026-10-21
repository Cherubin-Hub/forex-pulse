import type { MarketBias, PriceQuote } from "@/types/market";

// Deterministic fake chart: same input -> same output.
// We avoid Math.random() because the server and browser would generate
// different numbers, causing a React "hydration mismatch" error.
function buildSparkline(from: number, to: number, points = 24): number[] {
  const range = Math.abs(to - from);
  return Array.from({ length: points }, (_, i) => {
    const progress = i / (points - 1);
    const wave = Math.sin(i * 1.3) * range * 0.35;
    return from + (to - from) * progress + wave;
  });
}

function createMockQuote(
  symbol: string,
  price: number,
  previousClose: number,
  bias: MarketBias,
): PriceQuote {
  const spread = Math.abs(price - previousClose);
  return {
    symbol,
    price,
    previousClose,
    high: Math.max(price, previousClose) + spread * 0.4,
    low: Math.min(price, previousClose) - spread * 0.4,
    bias,
    sparkline: buildSparkline(previousClose, price),
    timestamp: new Date().toISOString(),
    source: "Demo dataset",
    delayMinutes: 0,
    status: "MOCK",
  };
}

export const MOCK_QUOTES: PriceQuote[] = [
  createMockQuote("EURUSD", 1.12452, 1.1271, "BEARISH"),
  createMockQuote("GBPUSD", 1.31874, 1.3162, "BULLISH"),
  createMockQuote("USDJPY", 149.382, 148.915, "BULLISH"),
  createMockQuote("AUDUSD", 0.66215, 0.6639, "BEARISH"),
  createMockQuote("NZDUSD", 0.60148, 0.60122, "NEUTRAL"),
  createMockQuote("USDCAD", 1.3654, 1.3631, "BULLISH"),
  createMockQuote("USDCHF", 0.88175, 0.8829, "BEARISH"),
  createMockQuote("XAUUSD", 2652.4, 2638.15, "BULLISH"),
];
