import type { TradingSetup } from "@/types/setup";
import type { PriceQuote } from "@/types/market";
import { INSTRUMENTS } from "@/lib/constants/instruments";

export type TradeProtectionStatus =
  | "TARGET_REACHED"
  | "TARGET_IMMINENT"
  | "BREAKEVEN_RECOMMENDED"
  | "IN_PROFIT"
  | "AT_ENTRY"
  | "IN_DRAWDOWN"
  | "STOP_IMMINENT"
  | "STOP_HIT";

export type ActiveTradeMetrics = {
  currentPrice: number;
  entryMid: number;
  multiplier: number;
  decimals: number;
  pnlPips: number;
  floatingR: number;
  pipsToTarget: number;
  pipsToStop: number;
  totalTargetPips: number;
  totalStopPips: number;
  progressPercent: number; // -100% (Stop Hit) to +100% (Target 1 Reached)
  protectionStatus: TradeProtectionStatus;
  statusLabel: string;
  isBreakevenEligible: boolean;
};

export type PendingTradeProximity = {
  currentPrice: number;
  entryMin: number;
  entryMax: number;
  multiplier: number;
  isInsideZone: boolean;
  pipsFromZone: number;
  directionToZone: "ABOVE" | "BELOW" | "INSIDE";
};

/**
 * Calculates live pip distance, floating R-multiple, and capital protection status for active trades.
 * Returns null if the market feed is unavailable or unverified (price is null).
 */
export function calculateActiveTradeMetrics(
  setup: TradingSetup,
  quote: PriceQuote
): ActiveTradeMetrics | null {
  if (quote.price === null) return null;

  const instrument = INSTRUMENTS.find((i) => i.symbol === setup.symbol);
  const decimals = instrument?.decimals ?? 5;
  const multiplier = decimals === 5 ? 10000 : decimals === 3 ? 100 : 10;

  const currentPrice = quote.price;
  const entryMid = (setup.entryMin + setup.entryMax) / 2;
  const isLong = setup.direction === "LONG";

  const totalTargetPips = Number((Math.abs(setup.takeProfit1 - entryMid) * multiplier).toFixed(1));
  const totalStopPips = Number((Math.abs(entryMid - setup.stopLoss) * multiplier).toFixed(1));
  const safeStopPips = totalStopPips > 0 ? totalStopPips : 1;

  // Floating PnL in pips from entry midpoint
  const pnlPips = Number(
    ((isLong ? currentPrice - entryMid : entryMid - currentPrice) * multiplier).toFixed(1)
  );

  // Floating R-Multiple
  const floatingR = Number((pnlPips / safeStopPips).toFixed(2));

  // Pips to Target 1 and Stop Loss
  const pipsToTarget = Number(
    ((isLong ? setup.takeProfit1 - currentPrice : currentPrice - setup.takeProfit1) * multiplier).toFixed(1)
  );
  const pipsToStop = Number(
    ((isLong ? currentPrice - setup.stopLoss : setup.stopLoss - currentPrice) * multiplier).toFixed(1)
  );

  // Normalized progress percentage: 0% at entry, 100% at TP1, -100% at SL
  let progressPercent = 0;
  if (pnlPips >= 0) {
    progressPercent = Math.min(100, Math.round((pnlPips / (totalTargetPips || 1)) * 100));
  } else {
    progressPercent = Math.max(-100, Math.round((pnlPips / safeStopPips) * 100));
  }

  // Determine Capital Protection Advisory
  let protectionStatus: TradeProtectionStatus = "AT_ENTRY";
  let statusLabel = "At Entry Zone";

  if (pipsToTarget <= 0) {
    protectionStatus = "TARGET_REACHED";
    statusLabel = "Take Profit 1 Reached";
  } else if (pipsToStop <= 0) {
    protectionStatus = "STOP_HIT";
    statusLabel = "Stop Loss Hit";
  } else if (pipsToTarget <= 8) {
    protectionStatus = "TARGET_IMMINENT";
    statusLabel = `TP1 Imminent (${pipsToTarget} pips away)`;
  } else if (pipsToStop <= 8) {
    protectionStatus = "STOP_IMMINENT";
    statusLabel = `SL Warning (${pipsToStop} pips to stop)`;
  } else if (floatingR >= 1.0) {
    protectionStatus = "BREAKEVEN_RECOMMENDED";
    statusLabel = `+${floatingR}R Profit • Move SL to Breakeven`;
  } else if (floatingR > 0) {
    protectionStatus = "IN_PROFIT";
    statusLabel = `Floating +${pnlPips} pips (+${floatingR}R)`;
  } else if (floatingR < 0) {
    protectionStatus = "IN_DRAWDOWN";
    statusLabel = `Floating ${pnlPips} pips (${floatingR}R)`;
  }

  const isBreakevenEligible = floatingR >= 1.0;

  return {
    currentPrice,
    entryMid,
    multiplier,
    decimals,
    pnlPips,
    floatingR,
    pipsToTarget,
    pipsToStop,
    totalTargetPips,
    totalStopPips,
    progressPercent,
    protectionStatus,
    statusLabel,
    isBreakevenEligible,
  };
}

/**
 * Calculates proximity to entry zone for pending setups (WAITING_FOR_CONFIRMATION).
 * Returns null if the market feed is unavailable or unverified (price is null).
 */
export function calculatePendingTradeProximity(
  setup: TradingSetup,
  quote: PriceQuote
): PendingTradeProximity | null {
  if (quote.price === null) return null;

  const instrument = INSTRUMENTS.find((i) => i.symbol === setup.symbol);
  const decimals = instrument?.decimals ?? 5;
  const multiplier = decimals === 5 ? 10000 : decimals === 3 ? 100 : 10;
  const currentPrice = quote.price;

  const min = Math.min(setup.entryMin, setup.entryMax);
  const max = Math.max(setup.entryMin, setup.entryMax);

  if (currentPrice >= min && currentPrice <= max) {
    return {
      currentPrice,
      entryMin: min,
      entryMax: max,
      multiplier,
      isInsideZone: true,
      pipsFromZone: 0,
      directionToZone: "INSIDE",
    };
  }

  if (currentPrice > max) {
    const pipsFromZone = Number(((currentPrice - max) * multiplier).toFixed(1));
    return {
      currentPrice,
      entryMin: min,
      entryMax: max,
      multiplier,
      isInsideZone: false,
      pipsFromZone,
      directionToZone: "ABOVE",
    };
  }

  const pipsFromZone = Number(((min - currentPrice) * multiplier).toFixed(1));
  return {
    currentPrice,
    entryMin: min,
    entryMax: max,
    multiplier,
    isInsideZone: false,
    pipsFromZone,
    directionToZone: "BELOW",
  };
}
