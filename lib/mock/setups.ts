import type { TradingSetup } from "@/types/setup";
import { calculateRiskReward } from "@/lib/setupUtils";

function createMockSetup(
  id: string, symbol: string, direction: "LONG" | "SHORT",
  entryMin: number, entryMax: number, stopLoss: number, tp1: number,
  status: TradingSetup["status"], confluenceTags: string[]
): TradingSetup {
  const entryAvg = (entryMin + entryMax) / 2;
  
  return {
    id, symbol, direction,
    entryMin, entryMax, stopLoss,
    takeProfit1: tp1, takeProfit2: null,
    riskReward: calculateRiskReward(direction, entryAvg, stopLoss, tp1),
    status,
    invalidationRule: direction === "LONG" ? `H1 close below ${stopLoss}` : `H1 close above ${stopLoss}`,
    notes: "Awaiting New York overlap volume.",
    confluenceTags,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const MOCK_ACTIVE_SETUPS: TradingSetup[] = [
  createMockSetup("setup-1", "EURUSD", "SHORT", 1.1260, 1.1270, 1.1290, 1.1215, "WAITING_FOR_CONFIRMATION", ["Liquidity Sweep", "Bearish BOS"]),
  createMockSetup("setup-2", "GBPUSD", "LONG", 1.3150, 1.3160, 1.3130, 1.3220, "ENTRY_TRIGGERED", ["Order Block", "Asian High Sweep"]),
];

export const MOCK_HISTORY_SETUPS: TradingSetup[] = [
  createMockSetup("setup-3", "USDJPY", "LONG", 148.50, 148.60, 148.20, 149.50, "TP_REACHED", ["Fib 61.8", "Bullish CHoCH"]),
  createMockSetup("setup-4", "AUDUSD", "SHORT", 0.6650, 0.6655, 0.6670, 0.6610, "SL_HIT", ["Resistance Reject"]),
  createMockSetup("setup-5", "XAUUSD", "LONG", 2630, 2635, 2620, 2660, "INVALIDATED", ["Trendline Break"]),
];
