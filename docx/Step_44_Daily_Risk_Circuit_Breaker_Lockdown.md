# Step 44: Daily Risk Circuit Breaker & Tilt Emergency Lockdown Engine

## 🎯 Objective
Solidify Forex Pulse's foundational design as an uncompromising **Digital Disciplinarian** by deploying an automated **Daily Risk Circuit Breaker & Tilt Emergency Lockdown Engine**. In institutional risk desks and prop trading firms, the number one cause of catastrophic account blowups is psychological **tilt**—traders taking impulsive, revenge-driven entries immediately following consecutive losses. This step delivers:
1. **Daily Circuit Breaker Engine (`lib/circuitBreakerUtils.ts`):** Calculates intraday cumulative realized R-multiples, loss counts, and remaining risk budget. Evaluates whether daily losses have breached the risk ceiling (e.g. `-2.0R`), and tracks voluntary self-imposed tilt lockouts via hydration-safe persistence.
2. **Global Circuit Breaker Terminal Banner (`components/layout/CircuitBreakerBanner.tsx`):** A persistent, responsive warning banner integrated directly beneath the universal header across all pages displaying live daily risk budget, warning states (`CAUTION`), and lockdown notices (`TRIPPED`).
3. **Tilt Emergency Self-Exclusion Modal (`components/risk/TiltEmergencyModal.tsx`):** An emergency tool allowing traders experiencing emotional distress or impulse to voluntarily lock their terminal for 2 hours, 4 hours, or until the next trading session.
4. **Universal Layout Integration (`app/(dashboard)/layout.tsx`):** Integrates the circuit breaker banner globally above all dashboard views.

---

## 🛠 Step-by-Step Implementation

### 1. Create Daily Circuit Breaker Engine (`lib/circuitBreakerUtils.ts`)
Calculates today's realized loss metrics in R-multiples and USD, evaluates automatic trip conditions, and manages voluntary tilt self-exclusion.

**File:** `lib/circuitBreakerUtils.ts`
```typescript
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
```

#### Why this was written this way:
- **PHT Intraday Normalization:** Resolves trades against `formatDayKeyPHT(now)` to ensure all midnight roll-overs strictly adhere to the trader's Manila timezone regardless of server UTC time.
- **Dual Automatic & Voluntary Protection:** Handles hard rule breaches (`-2.0R` loss or 2 consecutive stop-outs) while giving emotional traders a 1-click self-exclusion safety valve.

---

### 2. Create Tilt Emergency Self-Exclusion Modal (`components/risk/TiltEmergencyModal.tsx`)
Create the self-exclusion modal allowing traders to step away and voluntarily engage the circuit breaker.

**File:** `components/risk/TiltEmergencyModal.tsx`
```tsx
"use client";

import { useState } from "react";
import { ShieldAlert, AlertTriangle, Lock, HeartPulse, X, Check } from "lucide-react";
import { engageManualTiltLockout } from "@/lib/circuitBreakerUtils";

interface TiltEmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEngaged: () => void;
}

export function TiltEmergencyModal({
  isOpen,
  onClose,
  onEngaged,
}: TiltEmergencyModalProps) {
  const [selectedHours, setSelectedHours] = useState(4);
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;

  const handleEngageLockout = () => {
    engageManualTiltLockout(selectedHours);
    onEngaged();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md rounded-xl border border-rose-500/30 bg-card p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">
                Digital Disciplinarian • Tilt Emergency Lockout
              </h3>
              <p className="text-xs text-muted-foreground">
                Voluntary Self-Imposed Terminal Lockout
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mindset Prompt */}
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs space-y-1.5 text-amber-600 dark:text-amber-400">
          <div className="flex items-center gap-1.5 font-bold">
            <HeartPulse className="h-4 w-4" />
            <span>Preserve Capital. Step Away from the Charts.</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            If you feel frustration, revenge impulses, or emotional tilt after a stop-out, the highest edge action you can take right now is to stop trading and allow dopamine levels to reset.
          </p>
        </div>

        {/* Lockout Duration Selector */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Lockout Duration
          </label>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {[
              { hours: 2, label: "2 Hours", desc: "Cool Down" },
              { hours: 4, label: "4 Hours", desc: "Rest of Session" },
              { hours: 12, label: "12 Hours", desc: "Until Tomorrow" },
            ].map((opt) => (
              <button
                key={opt.hours}
                type="button"
                onClick={() => setSelectedHours(opt.hours)}
                className={`p-2.5 rounded-lg border text-center transition-all ${
                  selectedHours === opt.hours
                    ? "border-rose-500 bg-rose-500/10 text-foreground font-bold shadow-sm"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <div className="font-mono text-sm">{opt.label}</div>
                <div className="text-[10px] text-muted-foreground">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Confirmation Checkbox */}
        <label className="flex items-start gap-2.5 text-xs cursor-pointer select-none pt-1">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 rounded border-border"
          />
          <span className="leading-tight text-muted-foreground">
            I confirm that I am stepping away to protect my account equity and mental capital.
          </span>
        </label>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!confirmed}
            onClick={handleEngageLockout}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
              confirmed
                ? "bg-rose-500 text-white hover:bg-rose-600 shadow-sm"
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Engage Emergency Lockout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### Why this was written this way:
- **Behavioral Psychology Design:** Guides the trader to acknowledge emotional arousal with gentle, objective guidance instead of judgment.
- **Explicit Confirmation Check:** Prevents accidental lockouts with a deliberate affirmation requirement.

---

### 3. Create Global Circuit Breaker Terminal Banner (`components/layout/CircuitBreakerBanner.tsx`)
A responsive banner mounted directly beneath the header that alerts traders of their daily budget and locks the interface when tripped.

**File:** `components/layout/CircuitBreakerBanner.tsx`
```tsx
"use client";

import { useState, useMemo, useEffect } from "react";
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
import { cn } from "@/lib/utils";

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
```

#### Why this was written this way:
- **Proportional Escalation:** Graceful visual progression from subtle status pill (Normal) to warning bar (Caution) to high-visibility terminal alert (Tripped).
- **Zero Hydration Drift:** Evaluates dates safely within the client environment using `useNow()` and `useSettings()`.

---

### 4. Upgrade Universal Layout (`app/(dashboard)/layout.tsx`)
Embed the `CircuitBreakerBanner` globally beneath the universal `Header`.

**File:** `app/(dashboard)/layout.tsx`
```tsx
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { CircuitBreakerBanner } from "@/components/layout/CircuitBreakerBanner";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <CircuitBreakerBanner />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

---

## 🧪 Verification & Testing
1. Navigate across any page on the dashboard (`/`, `/markets`, `/setups`, `/risk`).
2. Observe the persistent **Intraday Risk Status Bar** directly beneath the header:
   - Verify it displays today's realized R-multiple, win/loss count, and remaining risk budget.
3. Click the **"Tilt Circuit Breaker"** button:
   - Verify the **Tilt Emergency Lockout Modal** opens.
   - Select a duration (e.g. 4 Hours), check the confirmation declaration, and click **"Engage Emergency Lockout"**.
4. Confirm the banner instantly escalates into the high-contrast **Circuit Breaker Engaged** alert.
5. Click **"Unlock"** to clear the manual self-exclusion and verify the banner returns to normal.
6. Run `npx tsc --noEmit` to verify 0 type errors.

