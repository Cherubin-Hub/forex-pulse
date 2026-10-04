import type { TradeDirection } from "@/types/setup";

/**
 * Calculates Risk:Reward ratio.
 * Always returns a positive number (e.g., 2.5 for a 1:2.5 trade).
 */
export function calculateRiskReward(
  direction: TradeDirection,
  entryAvg: number,
  stopLoss: number,
  takeProfit: number
): number {
  if (entryAvg === stopLoss) return 0; // Prevent division by zero

  const risk = Math.abs(entryAvg - stopLoss);
  const reward = Math.abs(takeProfit - entryAvg);
  
  // Double-check logic: A LONG trade must have TP > Entry > SL.
  if (direction === "LONG" && (takeProfit <= entryAvg || stopLoss >= entryAvg)) return 0;
  if (direction === "SHORT" && (takeProfit >= entryAvg || stopLoss <= entryAvg)) return 0;

  return reward / risk;
}

/**
 * Validates if a setup passes the user's strict risk rules.
 */
export function validateSetupRisk(
  rr: number,
  minAllowedRR: number
): { isValid: boolean; reason?: string } {
  if (rr < minAllowedRR) {
    return {
      isValid: false,
      reason: `R:R of 1:${rr.toFixed(1)} is below your minimum rule of 1:${minAllowedRR}`,
    };
  }
  return { isValid: true };
}
