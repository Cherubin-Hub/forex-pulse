export type TradeDirection = "LONG" | "SHORT";

export type SetupStatus =
  | "WAITING_FOR_CONFIRMATION" // Pending alert
  | "ENTRY_TRIGGERED"          // Active trade
  | "TP_REACHED"               // Won
  | "SL_HIT"                   // Lost
  | "INVALIDATED"              // Structure broke before entry
  | "EXPIRED";                 // Session ended before entry

export type TradingSetup = {
  id: string;
  symbol: string;              // "EURUSD"
  direction: TradeDirection;
  
  // Price levels
  entryMin: number;
  entryMax: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number | null;  // Optional second target
  
  // Analytics (Computed by the system)
  riskReward: number;
  
  // State
  status: SetupStatus;
  invalidationRule: string;    // e.g. "H1 acceptance above 1.1300"
  notes: string;
  confluenceTags: string[];    // e.g. ["Liquidity Sweep", "Fib 61.8"]
  
  createdAt: string;           // ISO 8601
  updatedAt: string;           // ISO 8601
};
