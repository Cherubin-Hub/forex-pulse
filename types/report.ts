export type SessionType = "LONDON_OPEN" | "NEW_YORK_OPEN" | "ASIAN_WRAP";
export type MarketBias = "BULLISH_USD" | "BEARISH_USD" | "NEUTRAL" | "RISK_OFF" | "RISK_ON";
export type VolatilityExpectation = "LOW" | "NORMAL" | "HIGH" | "EXTREME";

export interface KeyLevelBrief {
  symbol: string;
  support: number;
  resistance: number;
  pivot: number;
  bias: "BULLISH" | "BEARISH" | "NEUTRAL";
}

export interface SessionReport {
  id: string;
  title: string;
  session: SessionType;
  timestamp: string; // ISO 8601
  bias: MarketBias;
  volatility: VolatilityExpectation;
  executiveSummary: string;
  macroCatalysts: string[];
  keyLevels: KeyLevelBrief[];
  playbook: {
    focusPairs: string[];
    riskRule: string;
    tradeOpportunities: string[];
  };
}
