import type { TechnicalAnalysis } from "@/types/technical";

export const MOCK_TECHNICALS: TechnicalAnalysis[] = [
  {
    symbol: "EURUSD",
    overallBias: "BEARISH",
    timeframes: {
      D1: { rsi: 42, macd: "BEARISH", emaTrend: "BEARISH", atr: 65 },
      H4: { rsi: 38, macd: "BEARISH", emaTrend: "BEARISH", atr: 25 },
      H1: { rsi: 45, macd: "NEUTRAL", emaTrend: "BEARISH", atr: 12 },
      M15: { rsi: 60, macd: "BULLISH", emaTrend: "BULLISH", atr: 5 },
    },
  },
  {
    symbol: "GBPUSD",
    overallBias: "NEUTRAL",
    timeframes: {
      D1: { rsi: 51, macd: "NEUTRAL", emaTrend: "NEUTRAL", atr: 75 },
      H4: { rsi: 48, macd: "BEARISH", emaTrend: "NEUTRAL", atr: 30 },
      H1: { rsi: 40, macd: "BEARISH", emaTrend: "BEARISH", atr: 15 },
      M15: { rsi: 35, macd: "BEARISH", emaTrend: "BEARISH", atr: 8 },
    },
  },
  {
    symbol: "USDJPY",
    overallBias: "BULLISH",
    timeframes: {
      D1: { rsi: 64, macd: "BULLISH", emaTrend: "BULLISH", atr: 110 },
      H4: { rsi: 58, macd: "BULLISH", emaTrend: "BULLISH", atr: 45 },
      H1: { rsi: 52, macd: "NEUTRAL", emaTrend: "BULLISH", atr: 22 },
      M15: { rsi: 48, macd: "BEARISH", emaTrend: "NEUTRAL", atr: 10 },
    },
  },
  {
    symbol: "AUDUSD",
    overallBias: "BEARISH",
    timeframes: {
      D1: { rsi: 39, macd: "BEARISH", emaTrend: "BEARISH", atr: 55 },
      H4: { rsi: 42, macd: "BEARISH", emaTrend: "BEARISH", atr: 20 },
      H1: { rsi: 46, macd: "NEUTRAL", emaTrend: "BEARISH", atr: 11 },
      M15: { rsi: 52, macd: "BULLISH", emaTrend: "NEUTRAL", atr: 6 },
    },
  },
  {
    symbol: "NZDUSD",
    overallBias: "NEUTRAL",
    timeframes: {
      D1: { rsi: 48, macd: "NEUTRAL", emaTrend: "NEUTRAL", atr: 50 },
      H4: { rsi: 45, macd: "BEARISH", emaTrend: "NEUTRAL", atr: 18 },
      H1: { rsi: 49, macd: "NEUTRAL", emaTrend: "NEUTRAL", atr: 9 },
      M15: { rsi: 51, macd: "BULLISH", emaTrend: "BULLISH", atr: 5 },
    },
  },
  {
    symbol: "USDCAD",
    overallBias: "BULLISH",
    timeframes: {
      D1: { rsi: 62, macd: "BULLISH", emaTrend: "BULLISH", atr: 60 },
      H4: { rsi: 59, macd: "BULLISH", emaTrend: "BULLISH", atr: 24 },
      H1: { rsi: 55, macd: "BULLISH", emaTrend: "BULLISH", atr: 13 },
      M15: { rsi: 50, macd: "NEUTRAL", emaTrend: "BULLISH", atr: 6 },
    },
  },
  {
    symbol: "USDCHF",
    overallBias: "BEARISH",
    timeframes: {
      D1: { rsi: 41, macd: "BEARISH", emaTrend: "BEARISH", atr: 52 },
      H4: { rsi: 44, macd: "BEARISH", emaTrend: "BEARISH", atr: 19 },
      H1: { rsi: 47, macd: "NEUTRAL", emaTrend: "BEARISH", atr: 10 },
      M15: { rsi: 54, macd: "BULLISH", emaTrend: "NEUTRAL", atr: 5 },
    },
  },
  {
    symbol: "XAUUSD",
    overallBias: "BULLISH",
    timeframes: {
      D1: { rsi: 68, macd: "BULLISH", emaTrend: "BULLISH", atr: 250 },
      H4: { rsi: 72, macd: "BULLISH", emaTrend: "BULLISH", atr: 120 },
      H1: { rsi: 65, macd: "BULLISH", emaTrend: "BULLISH", atr: 50 },
      M15: { rsi: 55, macd: "NEUTRAL", emaTrend: "BULLISH", atr: 20 },
    },
  },
];
