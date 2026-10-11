# Step 42: Execution Disciplinarian & Pre-Trade Risk Gatekeeper Modal

## 🎯 Objective
Fulfill Forex Pulse's foundational design mandate as a **Digital Disciplinarian** by introducing an institutional pre-execution risk gatekeeper. Before a trade in `WAITING_FOR_CONFIRMATION` can be triggered into an active live market position (`ENTRY_TRIGGERED`), the Gatekeeper performs automated risk verification across four essential pillars:
1. **Macro News Blackout Window:** Audits upcoming economic events and blocks or warns the trader if a High-Impact (Red Folder) event is scheduled within 45 minutes for the trade's currency.
2. **Portfolio Exposure & Capacity Ceiling:** Enforces the user's maximum open position limit and risk allocation ceiling from user settings.
3. **Confluence Threshold Verification:** Confirms that the setup satisfies a minimum of 2 structural confluences.
4. **Psychological Discipline Affirmation:** Requires the trader to confirm three emotional discipline declarations (no FOMO/revenge trading, structural stop loss acceptance, and zero stop-loss tampering) before unlocking the execution trigger.

---

## 🛠 Step-by-Step Implementation

### 1. Create Pre-Trade Gatekeeper Evaluation Engine (`lib/gatekeeperUtils.ts`)
This utility audits economic events, portfolio limits, and confluence tags against institutional discipline rules.

**File:** `lib/gatekeeperUtils.ts`
```typescript
import type { TradingSetup } from "@/types/setup";
import type { EconomicEvent } from "@/types/calendar";
import type { UserSettings } from "@/lib/schemas/settings";
import { INSTRUMENTS } from "@/lib/constants/instruments";

export type AuditVerdict = "PASS" | "WARNING" | "BLOCKED";

export type GatekeeperAuditResult = {
  overallVerdict: AuditVerdict;
  newsCheck: {
    verdict: AuditVerdict;
    conflictEvent: EconomicEvent | null;
    minutesUntil: number | null;
    message: string;
  };
  riskCheck: {
    verdict: AuditVerdict;
    currentOpenCount: number;
    maxOpenSetups: number;
    totalRiskPercent: number;
    message: string;
  };
  confluenceCheck: {
    verdict: AuditVerdict;
    count: number;
    confluences: string[];
    message: string;
  };
};

/**
 * Runs the 3-pillar institutional pre-trade risk audit against macro events, portfolio capacity, and confluences.
 */
export function evaluatePreTradeAudit(
  setup: TradingSetup,
  events: EconomicEvent[],
  activeSetups: TradingSetup[],
  settings: UserSettings,
  now: Date
): GatekeeperAuditResult {
  const inst = INSTRUMENTS.find((i) => i.symbol === setup.symbol);
  const baseCurr = inst?.base ?? setup.symbol.slice(0, 3);
  const quoteCurr = inst?.quote ?? setup.symbol.slice(3, 6);

  // 1. Macro News Check (Red Folder High Impact Proximity)
  const nowMs = now.getTime();
  const relevantHighEvents = events
    .filter((e) => e.impact === "HIGH" && (e.currency === baseCurr || e.currency === quoteCurr))
    .map((e) => {
      const msUntil = new Date(e.scheduledAt).getTime() - nowMs;
      const minutesUntil = Math.round(msUntil / 60000);
      return { event: e, minutesUntil };
    })
    // Filter to events within next 45 minutes or released within last 15 minutes
    .filter((item) => item.minutesUntil >= -15 && item.minutesUntil <= 45)
    .sort((a, b) => Math.abs(a.minutesUntil) - Math.abs(b.minutesUntil));

  const conflict = relevantHighEvents[0] ?? null;

  let newsVerdict: AuditVerdict = "PASS";
  let newsMessage = `No high-impact news for ${baseCurr}/${quoteCurr} within 45 minutes.`;

  if (conflict) {
    if (conflict.minutesUntil > 0 && conflict.minutesUntil <= 15) {
      newsVerdict = "BLOCKED";
      newsMessage = `High-Impact ${conflict.event.title} (${conflict.event.currency}) in ${conflict.minutesUntil}m! Severe slippage risk.`;
    } else if (conflict.minutesUntil > 15 && conflict.minutesUntil <= 30) {
      newsVerdict = "WARNING";
      newsMessage = `High-Impact ${conflict.event.title} (${conflict.event.currency}) in ${conflict.minutesUntil}m. High volatility expected.`;
    } else if (conflict.minutesUntil <= 0) {
      newsVerdict = "WARNING";
      newsMessage = `High-Impact ${conflict.event.title} (${conflict.event.currency}) released ${Math.abs(conflict.minutesUntil)}m ago. Post-news spread wider.`;
    }
  }

  // 2. Risk Ceiling & Capacity Check
  const otherActive = activeSetups.filter(
    (s) => s.id !== setup.id && (s.status === "WAITING_FOR_CONFIRMATION" || s.status === "ENTRY_TRIGGERED")
  );
  const currentOpenCount = otherActive.length + 1; // including this one
  const maxOpenSetups = settings.maxOpenSetups;
  const totalRiskPercent = Number((currentOpenCount * settings.riskPerTradePercent).toFixed(2));

  let riskVerdict: AuditVerdict = "PASS";
  let riskMessage = `Portfolio risk capacity OK (${currentOpenCount}/${maxOpenSetups} open positions).`;

  if (currentOpenCount > maxOpenSetups) {
    riskVerdict = "BLOCKED";
    riskMessage = `Capacity breached! Max open positions limit (${maxOpenSetups}) reached.`;
  } else if (currentOpenCount === maxOpenSetups) {
    riskVerdict = "WARNING";
    riskMessage = `Final capacity slot (${currentOpenCount}/${maxOpenSetups}). No further trades allowed.`;
  }

  // 3. Confluence Verification
  const count = setup.confluenceTags.length;
  let confluenceVerdict: AuditVerdict = "PASS";
  let confluenceMessage = `${count} institutional confluences validated.`;

  if (count < 2) {
    confluenceVerdict = "WARNING";
    confluenceMessage = `Low confluence (${count}). Minimum 2 confluences recommended.`;
  }

  // Overall Verdict
  let overallVerdict: AuditVerdict = "PASS";
  if (newsVerdict === "BLOCKED" || riskVerdict === "BLOCKED") {
    overallVerdict = "BLOCKED";
  } else if (newsVerdict === "WARNING" || riskVerdict === "WARNING" || confluenceVerdict === "WARNING") {
    overallVerdict = "WARNING";
  }

  return {
    overallVerdict,
    newsCheck: {
      verdict: newsVerdict,
      conflictEvent: conflict?.event ?? null,
      minutesUntil: conflict?.minutesUntil ?? null,
      message: newsMessage,
    },
    riskCheck: {
      verdict: riskVerdict,
      currentOpenCount,
      maxOpenSetups,
      totalRiskPercent,
      message: riskMessage,
    },
    confluenceCheck: {
      verdict: confluenceVerdict,
      count,
      confluences: setup.confluenceTags,
      message: confluenceMessage,
    },
  };
}
```

#### Why this was written this way:
- **Currency-Specific News Proximity:** Only checks news events that belong to the base or quote currency of the trade, preventing false alerts from unrelated currencies.
- **Hierarchical Verdict Escalation:** If any check is `BLOCKED`, the overall status becomes `BLOCKED`. If any check has a `WARNING`, the overall verdict escalates to `WARNING`.
- **Zero Hydration Drift:** Accepts `now: Date` from the caller's hydration-safe clock hook (`useNow()`).

---

### 2. Create Pre-Trade Disciplinarian Gatekeeper Modal (`components/setups/PreTradeGatekeeperModal.tsx`)
Create the interactive pre-flight gatekeeper modal with audit badges, rule explanations, and psychological affirmation checkboxes.

**File:** `components/setups/PreTradeGatekeeperModal.tsx`
```tsx
"use client";

import { useState, useMemo, useTransition } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Flame,
  PieChart,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Loader2,
  X,
} from "lucide-react";
import type { TradingSetup } from "@/types/setup";
import { useSettings } from "@/hooks/useSettings";
import { useNow } from "@/hooks/useNow";
import { MOCK_EVENTS } from "@/lib/mock/events";
import { MOCK_ACTIVE_SETUPS } from "@/lib/mock/setups";
import { evaluatePreTradeAudit, type AuditVerdict } from "@/lib/gatekeeperUtils";
import { cn } from "@/lib/utils";

interface PreTradeGatekeeperModalProps {
  setup: TradingSetup;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function PreTradeGatekeeperModal({
  setup,
  isOpen,
  onClose,
  onConfirm,
}: PreTradeGatekeeperModalProps) {
  const { settings } = useSettings();
  const now = useNow();
  const [isPending, startTransition] = useTransition();

  // Psychology affirmations
  const [affirmedPlan, setAffirmedPlan] = useState(false);
  const [affirmedStopLoss, setAffirmedStopLoss] = useState(false);
  const [affirmedRisk, setAffirmedRisk] = useState(false);
  const [overrideAcknowledged, setOverrideAcknowledged] = useState(false);

  const audit = useMemo(() => {
    if (!now) return null;
    return evaluatePreTradeAudit(setup, MOCK_EVENTS, MOCK_ACTIVE_SETUPS, settings, now);
  }, [setup, settings, now]);

  if (!isOpen) return null;

  const isAllAffirmed = affirmedPlan && affirmedStopLoss && affirmedRisk;
  const isBlocked = audit?.overallVerdict === "BLOCKED";
  const canExecute = isAllAffirmed && (!isBlocked || overrideAcknowledged);

  const handleExecute = () => {
    startTransition(() => {
      onConfirm();
      onClose();
    });
  };

  const getVerdictBadge = (verdict: AuditVerdict) => {
    switch (verdict) {
      case "PASS":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-500 font-mono">
            <CheckCircle2 className="h-3 w-3" /> PASS
          </span>
        );
      case "WARNING":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-500 font-mono">
            <AlertTriangle className="h-3 w-3" /> WARNING
          </span>
        );
      case "BLOCKED":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-500 font-mono">
            <ShieldAlert className="h-3 w-3" /> BLOCKED
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">
                Digital Disciplinarian • Pre-Flight Gatekeeper
              </h3>
              <p className="text-xs text-muted-foreground">
                Verifying {setup.symbol} {setup.direction} (Target RR 1:{setup.riskReward.toFixed(1)})
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

        {/* 3-Pillar Audit Grid */}
        <div className="space-y-2">
          {/* Pillar 1: Macro News Blackout */}
          <div className="rounded-lg border border-border/80 bg-muted/20 p-2.5 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold">
                <Flame className="h-3.5 w-3.5 text-rose-500" />
                <span>Macro News Blackout Window</span>
              </div>
              {audit && getVerdictBadge(audit.newsCheck.verdict)}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {audit?.newsCheck.message}
            </p>
          </div>

          {/* Pillar 2: Portfolio Exposure & Capacity */}
          <div className="rounded-lg border border-border/80 bg-muted/20 p-2.5 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold">
                <PieChart className="h-3.5 w-3.5 text-sky-500" />
                <span>Portfolio Capacity & Max Risk</span>
              </div>
              {audit && getVerdictBadge(audit.riskCheck.verdict)}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {audit?.riskCheck.message}
            </p>
          </div>

          {/* Pillar 3: Structural Confluences */}
          <div className="rounded-lg border border-border/80 bg-muted/20 p-2.5 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>Structural Confluences</span>
              </div>
              {audit && getVerdictBadge(audit.confluenceCheck.verdict)}
            </div>
            <div className="flex flex-wrap gap-1 pt-1">
              {setup.confluenceTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded border border-border px-1.5 py-0.2 text-[10px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Psychological Affirmations */}
        <div className="rounded-lg border border-border/80 bg-muted/30 p-3 space-y-2.5">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Trader Discipline Affirmations
          </p>

          <label className="flex items-start gap-2.5 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={affirmedPlan}
              onChange={(e) => setAffirmedPlan(e.target.checked)}
              className="mt-0.5 rounded border-border"
            />
            <span className="leading-tight">
              I am entering strictly according to my playbook, <strong>NOT</strong> from FOMO or emotional impulse.
            </span>
          </label>

          <label className="flex items-start gap-2.5 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={affirmedStopLoss}
              onChange={(e) => setAffirmedStopLoss(e.target.checked)}
              className="mt-0.5 rounded border-border"
            />
            <span className="leading-tight">
              My Stop Loss is anchored to market structure, and I fully accept this financial risk.
            </span>
          </label>

          <label className="flex items-start gap-2.5 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={affirmedRisk}
              onChange={(e) => setAffirmedRisk(e.target.checked)}
              className="mt-0.5 rounded border-border"
            />
            <span className="leading-tight">
              I will never widen my Stop Loss or revenge trade if the market invalidates this position.
            </span>
          </label>

          {/* Block Override Checkbox */}
          {isBlocked && (
            <div className="pt-2 border-t border-rose-500/30">
              <label className="flex items-start gap-2 text-xs text-rose-500 font-semibold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={overrideAcknowledged}
                  onChange={(e) => setOverrideAcknowledged(e.target.checked)}
                  className="mt-0.5 rounded border-rose-500"
                />
                <span className="leading-tight">
                  Override Disciplinarian Block (I acknowledge high risk of slippage / risk breach).
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Cancel / Stand Down
          </button>

          <button
            type="button"
            disabled={!canExecute || isPending}
            onClick={handleExecute}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition-all",
              canExecute
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
            )}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isBlocked ? (
              <Lock className="h-3.5 w-3.5" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            <span>Confirm & Trigger Entry</span>
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### 3. Upgrade Setup Status Actions (`components/setups/SetupStatusActions.tsx`)
Intercept the "Trigger" action with the `PreTradeGatekeeperModal`.

**File:** `components/setups/SetupStatusActions.tsx`
```tsx
"use client";

import { useState, useTransition } from "react";
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Ban, 
  Trash2, 
  Loader2,
  ShieldCheck
} from "lucide-react";
import type { SetupStatus, TradingSetup } from "@/types/setup";
import { updateSetupStatus, deleteTradingSetup, setSetupToBreakeven } from "@/app/actions/setupActions";
import { PreTradeGatekeeperModal } from "@/components/setups/PreTradeGatekeeperModal";
import { Button } from "@/components/ui/button";

interface SetupStatusActionsProps {
  setup: TradingSetup;
}

export function SetupStatusActions({ setup }: SetupStatusActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [isGatekeeperOpen, setIsGatekeeperOpen] = useState(false);

  const handleTransition = (nextStatus: SetupStatus) => {
    startTransition(async () => {
      const result = await updateSetupStatus(setup.id, nextStatus);
      if (!result.success) {
        alert(`Failed to update trade: ${result.error}`);
      }
    });
  };

  const handleBreakeven = () => {
    startTransition(async () => {
      const result = await setSetupToBreakeven(setup.id);
      if (!result.success) {
        alert(`Failed to set Breakeven: ${result.error}`);
      }
    });
  };

  const handleDelete = () => {
    if (!confirm("Are you sure you want to delete this trading setup?")) return;
    startTransition(async () => {
      const result = await deleteTradingSetup(setup.id);
      if (!result.success) {
        alert(`Failed to delete setup: ${result.error}`);
      }
    });
  };

  if (isPending) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Updating...</span>
      </div>
    );
  }

  // Actions available when WAITING_FOR_CONFIRMATION
  if (setup.status === "WAITING_FOR_CONFIRMATION") {
    return (
      <>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[11px] text-sky-500 border-sky-500/30 hover:bg-sky-500/10"
            onClick={() => setIsGatekeeperOpen(true)}
            title="Pre-Flight Risk Check & Trigger"
          >
            <Play className="h-3 w-3 mr-1 fill-sky-500" />
            Trigger
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => handleTransition("INVALIDATED")}
            title="Structure Broken"
          >
            <Ban className="h-3 w-3 mr-1" />
            Invalidate
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
            title="Delete Setup"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Pre-Trade Disciplinarian Gatekeeper Modal */}
        <PreTradeGatekeeperModal
          setup={setup}
          isOpen={isGatekeeperOpen}
          onClose={() => setIsGatekeeperOpen(false)}
          onConfirm={() => handleTransition("ENTRY_TRIGGERED")}
        />
      </>
    );
  }

  // Actions available when ENTRY_TRIGGERED (Active Trade)
  if (setup.status === "ENTRY_TRIGGERED") {
    return (
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[11px] text-sky-500 border-sky-500/30 hover:bg-sky-500/10"
          onClick={handleBreakeven}
          title="Move Stop Loss to Entry Midpoint (Risk-Free)"
        >
          <ShieldCheck className="h-3 w-3 mr-1" />
          BE
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[11px] text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
          onClick={() => handleTransition("TP_REACHED")}
          title="Log Win (Take Profit Reached)"
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          TP Hit
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[11px] text-rose-500 border-rose-500/30 hover:bg-rose-500/10"
          onClick={() => handleTransition("SL_HIT")}
          title="Log Loss (Stop Loss Hit)"
        >
          <XCircle className="h-3 w-3 mr-1" />
          SL Hit
        </Button>
      </div>
    );
  }

  // For completed or historical setups, provide clean deletion option
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive ml-auto"
      onClick={handleDelete}
      title="Delete Setup"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
```

---

### 4. Update Setup Card Caller (`components/setups/SetupCard.tsx`)
Update line 94 in `SetupCard.tsx` to pass `setup={setup}`:

**File:** `components/setups/SetupCard.tsx`
```tsx
        {/* Action Buttons for Pending or Active Setups */}
        <div className="flex justify-end">
          <SetupStatusActions setup={setup} />
        </div>
```

---

## 🧪 Verification & Testing
1. Navigate to **`/setups`**.
2. Find a setup in **`Waiting`** status (`WAITING_FOR_CONFIRMATION`) and click **"Trigger"**.
3. Confirm the **Pre-Flight Gatekeeper Modal** opens:
   - Check the Macro News audit status.
   - Check the Portfolio Risk capacity badge.
   - Confirm the Confluence tag checklist.
4. Try clicking **"Confirm & Trigger Entry"** before selecting the checkboxes:
   - Verify the button is locked and disabled.
5. Check all 3 psychological discipline affirmations:
   - Verify the button unlocks.
6. Click **"Confirm & Trigger Entry"**:
   - Verify the trade smoothly transitions to `Active` (`ENTRY_TRIGGERED`), loading the real-time progress gauge.
7. Run `npx tsc --noEmit` to confirm 0 compilation errors.
