export type Timeframe = "D1" | "H4" | "H1" | "M15";
export type TrendDirection = "BULLISH" | "BEARISH" | "NEUTRAL";

export type IndicatorData = {
  rsi: number;
  macd: TrendDirection;
  emaTrend: TrendDirection; // Price relative to 50 & 200 EMA
  atr: number; // Average True Range (Volatility)
};

export type TechnicalAnalysis = {
  symbol: string;
  timeframes: Record<Timeframe, IndicatorData>;
  overallBias: TrendDirection;
};
