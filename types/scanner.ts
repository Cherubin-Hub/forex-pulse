import type { TradeDirection } from "./setup";
import type { TraderProfile } from "@/lib/schemas/settings";

export type StrategyType =
  | "MTF_TREND_PULLBACK"
  | "PIVOT_REVERSAL"
  | "SESSION_LIQUIDITY_SWEEP"
  | "M15_MOMENTUM_SCALP"
  | "INTRADAY_DAY_TRADE"
  | "SWING_STRUCTURE_BREAK";

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
  newsWindows?: { preReleaseMinutes: number; postReleaseMinutes: number };
  minConfluenceScore: number; // e.g., 60 for SCALPER, 70 for DAY_TRADER, 75 for SWING_TRADER
  minRiskReward: number; // e.g., 1.5 for SCALPER, 2.0 for DAY_TRADER, 2.5 for SWING_TRADER
  enableNewsFilter: boolean; // News Gatekeeper: avoid setups near high-impact events
  autoCommit: boolean; // Auto-save to Supabase without manual approval
  mode: "MANUAL" | "AUTOMATIC"; // Mode switch: Manual on-demand vs Automatic continuous
  scanIntervalSeconds: number; // Continuous loop interval in seconds (default: 15s)
  traderProfile?: TraderProfile; // SCALPER | DAY_TRADER | SWING_TRADER
  pollingIntervalMinutes?: number; // Legacy compatibility
};

export type ScannerRunResult = {
  scannedCount: number;
  opportunities: ScannedOpportunity[];
  committedCount: number;
  timestamp: string;
};
