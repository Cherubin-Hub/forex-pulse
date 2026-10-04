import type { TechnicalAnalysis } from "@/types/technical";

export const MOCK_TECHNICALS: TechnicalAnalysis[] = [
  {
    symbol: "EURUSD",
    overallBias: "BEARISH",
    timeframes: {
      D1: { rsi: 42, macd: "BEARISH", emaTrend: "BEARISH", atr: 65 },
      H4: { rsi: 38, macd: "BEARISH", emaTrend: "BEARISH", atr: 25 },
      H1: { rsi: 45, macd: "NEUTRAL", emaTrend: "BEARISH", atr: 12 },
      M15: { rsi: 60, macd: "BULLISH", emaTrend: "BULLISH", atr: 5 }, // Pullback on lower timeframe
    }
  },
  {
    symbol: "XAUUSD",
    overallBias: "BULLISH",
    timeframes: {
      D1: { rsi: 68, macd: "BULLISH", emaTrend: "BULLISH", atr: 250 },
      H4: { rsi: 72, macd: "BULLISH", emaTrend: "BULLISH", atr: 120 },
      H1: { rsi: 65, macd: "BULLISH", emaTrend: "BULLISH", atr: 50 },
      M15: { rsi: 55, macd: "NEUTRAL", emaTrend: "BULLISH", atr: 20 },
    }
  },
  {
    symbol: "GBPUSD",
    overallBias: "NEUTRAL",
    timeframes: {
      D1: { rsi: 51, macd: "NEUTRAL", emaTrend: "NEUTRAL", atr: 75 },
      H4: { rsi: 48, macd: "BEARISH", emaTrend: "NEUTRAL", atr: 30 },
      H1: { rsi: 40, macd: "BEARISH", emaTrend: "BEARISH", atr: 15 },
      M15: { rsi: 35, macd: "BEARISH", emaTrend: "BEARISH", atr: 8 },
    }
  }
];
