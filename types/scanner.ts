import type { TradeDirection } from "./setup";

export type StrategyType =
  | "MTF_TREND_PULLBACK"
  | "PIVOT_REVERSAL"
  | "SESSION_LIQUIDITY_SWEEP";

export type ScannedOpportunity = {
  id: string;
  symbol: string;
  direction: TradeDirection;
  strategy: StrategyType;
  entryMin: number;
  entryMax: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number | null;
  riskReward: number;
  confluenceScore: number;
  confluenceTags: string[];
  invalidationRule: string;
  notes: string;
  detectedAt: string;
  newsClear: boolean;
};

export type ScannerFilterConfig = {
  minConfluenceScore: number;     // e.g., 75 (%)
  minRiskReward: number;           // e.g., 2.0 (1:2.0)
  enableNewsFilter: boolean;       // News Gatekeeper: avoid setups near high-impact events
  autoCommit: boolean;             // Auto-save to Supabase without manual approval
  pollingIntervalMinutes: number;  // 0 = Off, 5 = Every 5 min, 15 = Every 15 min
};

export type ScannerRunResult = {
  scannedCount: number;
  opportunities: ScannedOpportunity[];
  committedCount: number;
  timestamp: string;
};
