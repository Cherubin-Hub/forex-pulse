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

export type PivotLevels = {
  pivot: number;
  r1: number;
  r2: number;
  s1: number;
  s2: number;
  projectedHigh: number;
  projectedLow: number;
};

export type ConfluenceScore = {
  scorePercent: number;
  dominantTrend: TrendDirection;
  alignmentLabel: string;
};
