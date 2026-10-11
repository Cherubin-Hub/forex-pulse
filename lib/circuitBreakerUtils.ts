import type { TradingSetup } from "@/types/setup";
import type { UserSettings } from "@/lib/schemas/settings";
import { formatDayKeyPHT } from "@/lib/formatters";

export type CircuitBreakerStatus = "NORMAL" | "CAUTION" | "TRIPPED";

export type CircuitBreakerMetrics = {
  status: CircuitBreakerStatus;
  todayRealizedR: number;
  todayRealizedUsd: number;
  todayLossCount: number;
  todayWinCount: number;
  maxDailyLossR: number;
  remainingRiskBudgetR: number;
  isTradingLocked: boolean;
  lockoutReason: string | null;
  isManualLockout: boolean;
  lockoutUntil: string | null;
};

const TILT_LOCKOUT_KEY = "forex_pulse_tilt_lockout_v1";

/**
 * Calculates today's realized R-multiple for a resolved setup.
 */
function getSetupR(setup: TradingSetup): number {
  if (setup.status === "TP_REACHED") return Number(setup.riskReward.toFixed(1));
  if (setup.status === "SL_HIT") return -1.0;
  return 0.0;
}

/**
 * Evaluates the daily risk circuit breaker based on closed setups and voluntary tilt lockout.
 */
export function evaluateCircuitBreaker(
  setups: TradingSetup[],
  settings: UserSettings,
  now: Date,
  accountBalance = 10000
): CircuitBreakerMetrics {
  const todayKey = formatDayKeyPHT(now);

  // Filter setups resolved today in Manila timezone (PHT)
  const todayResolved = setups.filter(
    (s) =>
      (s.status === "TP_REACHED" || s.status === "SL_HIT" || s.status === "INVALIDATED") &&
      formatDayKeyPHT(s.updatedAt) === todayKey
  );

  let todayRealizedR = 0;
  let todayLossCount = 0;
  let todayWinCount = 0;

  for (const s of todayResolved) {
    const r = getSetupR(s);
    todayRealizedR += r;
    if (s.status === "TP_REACHED") todayWinCount += 1;
    if (s.status === "SL_HIT") todayLossCount += 1;
  }

  todayRealizedR = Number(todayRealizedR.toFixed(2));

  // Risk calculation based on settings (default daily max loss is 2 full stop-outs: -2.0R)
  const maxDailyLossR = -2.0;
  const riskAmountPerTrade = accountBalance * (settings.riskPerTradePercent / 100);
  const todayRealizedUsd = Number((todayRealizedR * riskAmountPerTrade).toFixed(2));
  const remainingRiskBudgetR = Number(Math.max(0, maxDailyLossR - todayRealizedR + 2.0).toFixed(2));

  // Check voluntary manual tilt lockout
  let isManualLockout = false;
  let manualLockoutUntil: string | null = null;

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(TILT_LOCKOUT_KEY);
      if (stored) {
        const lockoutDate = new Date(stored);
        if (lockoutDate.getTime() > now.getTime()) {
          isManualLockout = true;
          manualLockoutUntil = stored;
        } else {
          localStorage.removeItem(TILT_LOCKOUT_KEY);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  // Determine circuit breaker state
  let status: CircuitBreakerStatus = "NORMAL";
  let isTradingLocked = false;
  let lockoutReason: string | null = null;

  if (isManualLockout) {
    status = "TRIPPED";
    isTradingLocked = true;
    lockoutReason = "Voluntary Tilt Self-Exclusion: Terminal locked to protect equity.";
  } else if (todayRealizedR <= maxDailyLossR || todayLossCount >= 2) {
    status = "TRIPPED";
    isTradingLocked = true;
    lockoutReason = `Daily risk limit breached (${todayRealizedR}R / ${todayLossCount} losses). Mandatory circuit breaker engaged.`;
  } else if (todayRealizedR <= -1.0 || todayLossCount === 1) {
    status = "CAUTION";
    isTradingLocked = false;
    lockoutReason = "Caution: 50% of daily risk budget consumed (-1.0R). 1 loss remaining.";
  }

  return {
    status,
    todayRealizedR,
    todayRealizedUsd,
    todayLossCount,
    todayWinCount,
    maxDailyLossR,
    remainingRiskBudgetR,
    isTradingLocked,
    lockoutReason,
    isManualLockout,
    lockoutUntil: manualLockoutUntil,
  };
}

/**
 * Engages a voluntary self-imposed tilt lockout for a specified number of hours.
 */
export function engageManualTiltLockout(hours: number): void {
  if (typeof window === "undefined") return;
  try {
    const unlockTime = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    localStorage.setItem(TILT_LOCKOUT_KEY, unlockTime);
  } catch (err) {
    console.error("Failed to set tilt lockout:", err);
  }
}

/**
 * Clears an active manual tilt lockout.
 */
export function clearManualTiltLockout(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TILT_LOCKOUT_KEY);
  } catch (err) {
    console.error("Failed to clear tilt lockout:", err);
  }
}
