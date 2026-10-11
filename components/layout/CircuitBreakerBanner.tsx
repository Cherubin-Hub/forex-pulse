"use client";

import { useState, useMemo } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Lock,
  Unlock,
  HeartPulse,
} from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { useNow } from "@/hooks/useNow";
import { MOCK_ACTIVE_SETUPS, MOCK_HISTORY_SETUPS } from "@/lib/mock/setups";
import {
  evaluateCircuitBreaker,
  clearManualTiltLockout,
} from "@/lib/circuitBreakerUtils";
import { TiltEmergencyModal } from "@/components/risk/TiltEmergencyModal";

export function CircuitBreakerBanner() {
  const { settings } = useSettings();
  const now = useNow();
  const [isTiltModalOpen, setIsTiltModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Combine setups for intraday evaluation
  const allSetups = useMemo(() => {
    return [...MOCK_ACTIVE_SETUPS, ...MOCK_HISTORY_SETUPS];
  }, []);

  const metrics = useMemo(() => {
    if (!now) return null;
    return evaluateCircuitBreaker(allSetups, settings, now);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshKey enables manual toggle updates
  }, [allSetups, settings, now, refreshKey]);

  if (!metrics) return null;

  // In Normal state, provide an unobtrusive risk budget pill and voluntary Tilt button
  if (metrics.status === "NORMAL") {
    return (
      <>
        <div className="flex items-center justify-between border-b border-border/40 bg-muted/20 px-4 py-1.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-medium text-muted-foreground">
              Intraday Risk Status:
            </span>
            <span className="font-mono text-[11px] font-bold text-foreground">
              {metrics.todayRealizedR >= 0 ? `+${metrics.todayRealizedR}R` : `${metrics.todayRealizedR}R`}
            </span>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              ({metrics.todayWinCount}W / {metrics.todayLossCount}L) • Budget: {metrics.remainingRiskBudgetR}R Available
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsTiltModalOpen(true)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-rose-500 transition-colors"
            title="Feeling emotional or tilted? Engage emergency self-exclusion"
          >
            <HeartPulse className="h-3 w-3 text-rose-500" />
            <span className="hidden sm:inline">Tilt Circuit Breaker</span>
          </button>
        </div>

        <TiltEmergencyModal
          isOpen={isTiltModalOpen}
          onClose={() => setIsTiltModalOpen(false)}
          onEngaged={() => setRefreshKey((k) => k + 1)}
        />
      </>
    );
  }

  // Caution state (1 loss / -1.0R)
  if (metrics.status === "CAUTION") {
    return (
      <>
        <div className="flex items-center justify-between border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-600 dark:text-amber-400 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <div className="truncate">
              <span className="font-bold">Risk Caution:</span>{" "}
              <span>{metrics.lockoutReason}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsTiltModalOpen(true)}
            className="ml-2 inline-flex items-center gap-1 shrink-0 rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold hover:bg-amber-500/30 transition-colors"
          >
            <Lock className="h-3 w-3" />
            <span>Lock Terminal</span>
          </button>
        </div>

        <TiltEmergencyModal
          isOpen={isTiltModalOpen}
          onClose={() => setIsTiltModalOpen(false)}
          onEngaged={() => setRefreshKey((k) => k + 1)}
        />
      </>
    );
  }

  // Tripped state (-2.0R / 2 losses or voluntary lockout)
  return (
    <>
      <div className="flex items-center justify-between border-b border-rose-500/40 bg-rose-500/15 px-4 py-2.5 text-xs text-rose-600 dark:text-rose-400 animate-in fade-in duration-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white shrink-0 animate-pulse">
            <ShieldAlert className="h-3.5 w-3.5" />
          </div>
          <div className="truncate">
            <span className="font-extrabold uppercase tracking-wide">
              Circuit Breaker Engaged:
            </span>{" "}
            <span className="font-medium text-foreground">{metrics.lockoutReason}</span>
          </div>
        </div>

        {metrics.isManualLockout && (
          <button
            type="button"
            onClick={() => {
              clearManualTiltLockout();
              setRefreshKey((k) => k + 1);
            }}
            className="ml-2 inline-flex items-center gap-1 shrink-0 rounded bg-background border border-border px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <Unlock className="h-3 w-3" />
            <span>Unlock</span>
          </button>
        )}
      </div>

      <TiltEmergencyModal
        isOpen={isTiltModalOpen}
        onClose={() => setIsTiltModalOpen(false)}
        onEngaged={() => setRefreshKey((k) => k + 1)}
      />
    </>
  );
}
