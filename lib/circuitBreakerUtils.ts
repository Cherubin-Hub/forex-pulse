import type { TradingSetup } from "@/types/setup";
import type { UserSettings } from "@/lib/schemas/settings";
import { calculateRealizedR } from "@/lib/postMortemUtils";
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

/**
 * Evaluates the daily risk circuit breaker based on closed setups and voluntary tilt lockout.
 */
export function evaluateCircuitBreaker(
  setups: TradingSetup[],
  settings: UserSettings,
  now: Date,
  accountBalance = settings.accountBalance,
): CircuitBreakerMetrics {
  const todayKey = formatDayKeyPHT(now);

  // Filter setups resolved today in Manila timezone (PHT)
  const todayResolved = setups.filter(
    (s) =>
      (s.status === "TP_REACHED" ||
        s.status === "SL_HIT" ||
        s.status === "INVALIDATED") &&
      formatDayKeyPHT(s.closedAt ?? s.updatedAt) === todayKey,
  );

  let todayRealizedR = 0;
  let todayLossCount = 0;
  let todayWinCount = 0;

  for (const s of todayResolved) {
    const r = calculateRealizedR(s);
    todayRealizedR += r;
    if (r > 0) todayWinCount += 1;
    if (r < 0) todayLossCount += 1;
  }

  todayRealizedR = Number(todayRealizedR.toFixed(2));

  // Risk calculation based on settings (default daily max loss is 2 full stop-outs: -2.0R)
  const maxDailyLossR = -settings.maxDailyLossR;
  const todayRealizedUsd = Number(
    todayResolved
      .reduce(
        (sum, setup) =>
          sum +
          calculateRealizedR(setup) *
            accountBalance *
            ((setup.riskPercent ?? settings.riskPerTradePercent) / 100),
        0,
      )
      .toFixed(2),
  );
  const remainingRiskBudgetR = Number(
    Math.max(0, todayRealizedR - maxDailyLossR).toFixed(2),
  );

  const manualLockoutUntil = settings.manualLockoutUntil;
  const isManualLockout = Boolean(
    manualLockoutUntil && Date.parse(manualLockoutUntil) > now.getTime(),
  );

  // Determine circuit breaker state
  let status: CircuitBreakerStatus = "NORMAL";
  let isTradingLocked = false;
  let lockoutReason: string | null = null;

  if (isManualLockout) {
    status = "TRIPPED";
    isTradingLocked = true;
    lockoutReason =
      "Voluntary Tilt Self-Exclusion: Terminal locked to protect equity.";
  } else if (todayRealizedR <= maxDailyLossR) {
    status = "TRIPPED";
    isTradingLocked = true;
    lockoutReason = `Daily risk limit breached (${todayRealizedR}R / ${todayLossCount} losses). Mandatory circuit breaker engaged.`;
  } else if (todayRealizedR <= maxDailyLossR / 2) {
    status = "CAUTION";
    isTradingLocked = false;
    lockoutReason =
      "Caution: At least half of the configured daily loss budget has been consumed.";
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
