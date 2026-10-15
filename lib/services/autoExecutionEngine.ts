import type { TradingSetup, SetupStatus } from "@/types/setup";

export interface SetupAutoResolutionResult {
  setupId: string;
  symbol: string;
  previousStatus: SetupStatus;
  nextStatus: SetupStatus;
  triggerPrice: number;
  reason: string;
  pnlR?: number;
}

/**
 * Pure evaluation function: Checks if a setup has reached its Entry Zone, Take Profit, or Stop Loss.
 *
 * Symmetrical Rules:
 * - WAITING_FOR_CONFIRMATION:
 *   - LONG: Price reaches entry zone [entryMin, entryMax] -> ENTRY_TRIGGERED.
 *           Price drops below stopLoss before entry -> INVALIDATED.
 *   - SHORT: Price reaches entry zone [entryMin, entryMax] -> ENTRY_TRIGGERED.
 *            Price rallies above stopLoss before entry -> INVALIDATED.
 *
 * - ENTRY_TRIGGERED:
 *   - LONG: Price >= takeProfit1 -> TP_REACHED (+R win).
 *           Price <= stopLoss -> SL_HIT (-1.0R loss).
 *   - SHORT: Price <= takeProfit1 -> TP_REACHED (+R win).
 *            Price >= stopLoss -> SL_HIT (-1.0R loss).
 */
export function evaluateSetupAutoResolution(
  setup: TradingSetup,
  currentPrice: number | null
): SetupAutoResolutionResult | null {
  if (currentPrice === null || currentPrice <= 0) return null;

  const isLong = setup.direction === "LONG";

  // 1. Pending Trade (Waiting for Entry Zone confirmation)
  if (setup.status === "WAITING_FOR_CONFIRMATION") {
    if (isLong) {
      // Invalidation: Price crashed below structural stop before pulling back into entry
      if (currentPrice <= setup.stopLoss) {
        return {
          setupId: setup.id,
          symbol: setup.symbol,
          previousStatus: setup.status,
          nextStatus: "INVALIDATED",
          triggerPrice: currentPrice,
          reason: `Market dropped to ${currentPrice}, breaking Stop Loss @ ${setup.stopLoss} before entry.`,
        };
      }

      // Auto-Trigger: Price entered the entry zone
      if (currentPrice <= setup.entryMax && currentPrice >= setup.entryMin) {
        return {
          setupId: setup.id,
          symbol: setup.symbol,
          previousStatus: setup.status,
          nextStatus: "ENTRY_TRIGGERED",
          triggerPrice: currentPrice,
          reason: `Market pulled back into Entry Zone [${setup.entryMin} - ${setup.entryMax}] at ${currentPrice}.`,
        };
      }
    } else {
      // SHORT
      // Invalidation: Price broke above structural stop before rally into entry
      if (currentPrice >= setup.stopLoss) {
        return {
          setupId: setup.id,
          symbol: setup.symbol,
          previousStatus: setup.status,
          nextStatus: "INVALIDATED",
          triggerPrice: currentPrice,
          reason: `Market rallied to ${currentPrice}, breaking Stop Loss @ ${setup.stopLoss} before entry.`,
        };
      }

      // Auto-Trigger: Price entered the entry zone
      if (currentPrice >= setup.entryMin && currentPrice <= setup.entryMax) {
        return {
          setupId: setup.id,
          symbol: setup.symbol,
          previousStatus: setup.status,
          nextStatus: "ENTRY_TRIGGERED",
          triggerPrice: currentPrice,
          reason: `Market rallied into Entry Zone [${setup.entryMin} - ${setup.entryMax}] at ${currentPrice}.`,
        };
      }
    }

    return null;
  }

  // 2. Active Trade (Monitoring TP and SL)
  if (setup.status === "ENTRY_TRIGGERED") {
    if (isLong) {
      // Take Profit Check
      if (currentPrice >= setup.takeProfit1) {
        return {
          setupId: setup.id,
          symbol: setup.symbol,
          previousStatus: setup.status,
          nextStatus: "TP_REACHED",
          triggerPrice: currentPrice,
          pnlR: Number(setup.riskReward.toFixed(1)),
          reason: `Take Profit 1 hit at ${currentPrice} (Target: ${setup.takeProfit1}).`,
        };
      }

      // Stop Loss Check
      if (currentPrice <= setup.stopLoss) {
        return {
          setupId: setup.id,
          symbol: setup.symbol,
          previousStatus: setup.status,
          nextStatus: "SL_HIT",
          triggerPrice: currentPrice,
          pnlR: -1.0,
          reason: `Stop Loss hit at ${currentPrice} (Stop: ${setup.stopLoss}).`,
        };
      }
    } else {
      // SHORT
      // Take Profit Check
      if (currentPrice <= setup.takeProfit1) {
        return {
          setupId: setup.id,
          symbol: setup.symbol,
          previousStatus: setup.status,
          nextStatus: "TP_REACHED",
          triggerPrice: currentPrice,
          pnlR: Number(setup.riskReward.toFixed(1)),
          reason: `Take Profit 1 hit at ${currentPrice} (Target: ${setup.takeProfit1}).`,
        };
      }

      // Stop Loss Check
      if (currentPrice >= setup.stopLoss) {
        return {
          setupId: setup.id,
          symbol: setup.symbol,
          previousStatus: setup.status,
          nextStatus: "SL_HIT",
          triggerPrice: currentPrice,
          pnlR: -1.0,
          reason: `Stop Loss hit at ${currentPrice} (Stop: ${setup.stopLoss}).`,
        };
      }
    }

    return null;
  }

  return null;
}
