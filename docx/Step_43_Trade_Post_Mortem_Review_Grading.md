# Step 43: Trade Post-Mortem Review & Execution Quality Grading System

## 🎯 Objective
Complete the trader's behavioral feedback loop by introducing an institutional **Post-Mortem Review & Execution Quality Grading System** for resolved setups on `/setups/history`. In professional proprietary trading firms, trading edge is measured not merely by PnL, but by **Process Adherence**. This step delivers:
1. **Post-Mortem Modeling & Discipline Engine (`lib/postMortemUtils.ts`):** Defines execution grades (`A` to `F`), psychological state classifications, mistake categorizations, rule adherence checklists, discipline score formulas (0-100%), and realized outcome calculations.
2. **Interactive Post-Mortem Review Modal (`components/setups/TradePostMortemModal.tsx`):** A dedicated retrospective journaling interface allowing traders to grade their process, select emotional states during the trade, record rule violations, and document lessons learned.
3. **Setup Status Actions Integration (`components/setups/SetupStatusActions.tsx`):** Upgrades historical setup cards with a dynamic **Post-Mortem Review** button displaying the awarded execution grade and discipline score.
4. **Setup History View Integration (`components/setups/SetupHistoryView.tsx`):** Adds execution grade filtering and discipline analytics to connect psychological discipline directly to R-multiple performance.

---

## 🛠 Step-by-Step Implementation

### 1. Create Post-Mortem Storage & Analytics Utilities (`lib/postMortemUtils.ts`)
Define the types, discipline scoring algorithms, and client-side persistence for post-trade reviews.

**File:** `lib/postMortemUtils.ts`
```typescript
import type { TradingSetup } from "@/types/setup";
import { INSTRUMENTS } from "@/lib/constants/instruments";

export type ExecutionGrade = "A" | "B" | "C" | "D" | "F";

export type PsychologicalState =
  | "DISCIPLINED"
  | "CONFIDENT"
  | "NEUTRAL"
  | "ANXIOUS"
  | "FOMO"
  | "HESITANT"
  | "REVENGE";

export type MistakeCategory =
  | "NONE"
  | "EARLY_ENTRY"
  | "LATE_CHASE"
  | "MOVED_SL"
  | "PREMATURE_EXIT"
  | "OVERSIZED"
  | "NEWS_GAMBLE"
  | "IGNORED_HTF_BIAS";

export type TradePostMortem = {
  setupId: string;
  grade: ExecutionGrade;
  psychology: PsychologicalState;
  mistake: MistakeCategory;
  rulesFollowed: {
    planFollowed: boolean;
    riskManaged: boolean;
    stopHonored: boolean;
    targetPatient: boolean;
  };
  disciplineScore: number; // 0 to 100
  retrospectiveNotes: string;
  reviewedAt: string;
};

const STORAGE_KEY = "forex_pulse_post_mortems_v1";

/**
 * Calculates realized R-multiple based on resolution status.
 */
export function calculateRealizedR(setup: TradingSetup): number {
  if (setup.status === "TP_REACHED") return Number(setup.riskReward.toFixed(1));
  if (setup.status === "SL_HIT") return -1.0;
  return 0.0; // INVALIDATED or EXPIRED
}

/**
 * Calculates realized pip distance gained or lost upon trade resolution.
 */
export function calculateRealizedPips(setup: TradingSetup): number {
  const inst = INSTRUMENTS.find((i) => i.symbol === setup.symbol);
  const decimals = inst?.decimals ?? 5;
  const multiplier = decimals === 5 ? 10000 : decimals === 3 ? 100 : 10;
  const entryMid = (setup.entryMin + setup.entryMax) / 2;

  if (setup.status === "TP_REACHED") {
    return Number((Math.abs(setup.takeProfit1 - entryMid) * multiplier).toFixed(1));
  }
  if (setup.status === "SL_HIT") {
    return -Number((Math.abs(entryMid - setup.stopLoss) * multiplier).toFixed(1));
  }
  return 0.0;
}

/**
 * Formats elapsed holding time between trade creation and resolution.
 */
export function calculateTradeDuration(createdAt: string, updatedAt: string): string {
  const start = new Date(createdAt).getTime();
  const end = new Date(updatedAt).getTime();
  const diffMs = Math.max(0, end - start);

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;

  if (days > 0) return `${days}d ${remHours}h`;
  if (hours > 0) return `${hours}h`;
  const minutes = Math.floor(diffMs / (1000 * 60));
  return `${minutes}m`;
}

/**
 * Computes a weighted 0-100% discipline score from the adherence checklist.
 */
export function calculateDisciplineScore(rules: TradePostMortem["rulesFollowed"]): number {
  let score = 0;
  if (rules.planFollowed) score += 30;
  if (rules.riskManaged) score += 30;
  if (rules.stopHonored) score += 25;
  if (rules.targetPatient) score += 15;
  return score;
}

export function getGradeBadgeColor(grade: ExecutionGrade): string {
  switch (grade) {
    case "A":
      return "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
    case "B":
      return "bg-sky-500/15 text-sky-500 border-sky-500/30";
    case "C":
      return "bg-amber-500/15 text-amber-500 border-amber-500/30";
    case "D":
      return "bg-orange-500/15 text-orange-500 border-orange-500/30";
    case "F":
      return "bg-rose-500/15 text-rose-500 border-rose-500/30";
  }
}

/**
 * Loads all stored post-mortem reviews from localStorage.
 */
export function loadAllPostMortems(): Record<string, TradePostMortem> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Persists a post-mortem review for a specific trade setup.
 */
export function savePostMortem(review: TradePostMortem): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadAllPostMortems();
    existing[review.setupId] = review;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error("Failed to persist post-mortem review:", err);
  }
}
```

#### Why this was written this way:
- **Process Over Outcome Separation:** Realized R-multiples measure financial results, while `ExecutionGrade` and `disciplineScore` measure rule adherence. A winning trade executed impulsively can earn an `F`, preventing dangerous bad-habit reinforcement.
- **Hydration Match Guarding:** Safely checks `typeof window === "undefined"` to prevent SSR mismatch exceptions during Next.js server pre-rendering.

---

### 2. Create Interactive Post-Mortem Modal (`components/setups/TradePostMortemModal.tsx`)
Create the retrospective review dialog with grade selection, psychological mood chips, rule checklists, and retrospective notes.

**File:** `components/setups/TradePostMortemModal.tsx`
```tsx
"use client";

import { useState, useEffect } from "react";
import {
  Award,
  Brain,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Save,
  X,
  Clock,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import type { TradingSetup } from "@/types/setup";
import {
  type ExecutionGrade,
  type PsychologicalState,
  type MistakeCategory,
  type TradePostMortem,
  calculateRealizedR,
  calculateRealizedPips,
  calculateTradeDuration,
  calculateDisciplineScore,
  getGradeBadgeColor,
  savePostMortem,
} from "@/lib/postMortemUtils";
import { cn } from "@/lib/utils";

interface TradePostMortemModalProps {
  setup: TradingSetup;
  isOpen: boolean;
  onClose: () => void;
  existingReview?: TradePostMortem | null;
  onSave?: (saved: TradePostMortem) => void;
}

const GRADES: { grade: ExecutionGrade; label: string; desc: string }[] = [
  { grade: "A", label: "Flawless", desc: "100% plan execution, zero emotional interference" },
  { grade: "B", label: "Solid", desc: "Good execution with minor, non-critical deviation" },
  { grade: "C", label: "Hesitant", desc: "Deviated from plan but respected stop loss" },
  { grade: "D", label: "Impulsive", desc: "Violated risk sizing or moved stop loss" },
  { grade: "F", label: "Reckless", desc: "FOMO, revenge entry, or complete rule breakdown" },
];

const PSYCHOLOGY_OPTIONS: { state: PsychologicalState; label: string }[] = [
  { state: "DISCIPLINED", label: "Disciplined" },
  { state: "CONFIDENT", label: "Confident" },
  { state: "NEUTRAL", label: "Calm / Neutral" },
  { state: "ANXIOUS", label: "Anxious" },
  { state: "FOMO", label: "FOMO / Chasing" },
  { state: "HESITANT", label: "Hesitant" },
  { state: "REVENGE", label: "Revenge / Tilt" },
];

const MISTAKES: { category: MistakeCategory; label: string }[] = [
  { category: "NONE", label: "None (Executed to Plan)" },
  { category: "EARLY_ENTRY", label: "Early Entry (Chased before candle close)" },
  { category: "LATE_CHASE", label: "Late Chase (Entered after momentum moved)" },
  { category: "MOVED_SL", label: "Moved Stop Loss (Widened risk during drawdown)" },
  { category: "PREMATURE_EXIT", label: "Premature Exit (Closed before TP/SL target)" },
  { category: "OVERSIZED", label: "Oversized Position (Exceeded risk percentage)" },
  { category: "NEWS_GAMBLE", label: "News Gamble (Held through high-impact release)" },
  { category: "IGNORED_HTF_BIAS", label: "Ignored Higher-Timeframe Trend" },
];

export function TradePostMortemModal({
  setup,
  isOpen,
  onClose,
  existingReview,
  onSave,
}: TradePostMortemModalProps) {
  const [grade, setGrade] = useState<ExecutionGrade>(existingReview?.grade ?? "A");
  const [psychology, setPsychology] = useState<PsychologicalState>(
    existingReview?.psychology ?? "DISCIPLINED"
  );
  const [mistake, setMistake] = useState<MistakeCategory>(existingReview?.mistake ?? "NONE");
  const [rules, setRules] = useState(
    existingReview?.rulesFollowed ?? {
      planFollowed: true,
      riskManaged: true,
      stopHonored: true,
      targetPatient: true,
    }
  );
  const [notes, setNotes] = useState(existingReview?.retrospectiveNotes ?? "");

  // Sync state if existingReview changes
  useEffect(() => {
    if (existingReview) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync with existing review
      setGrade(existingReview.grade);
      setPsychology(existingReview.psychology);
      setMistake(existingReview.mistake);
      setRules(existingReview.rulesFollowed);
      setNotes(existingReview.retrospectiveNotes);
    }
  }, [existingReview]);

  if (!isOpen) return null;

  const realizedR = calculateRealizedR(setup);
  const realizedPips = calculateRealizedPips(setup);
  const duration = calculateTradeDuration(setup.createdAt, setup.updatedAt);
  const disciplineScore = calculateDisciplineScore(rules);

  const handleSave = () => {
    const postMortem: TradePostMortem = {
      setupId: setup.id,
      grade,
      psychology,
      mistake,
      rulesFollowed: rules,
      disciplineScore,
      retrospectiveNotes: notes.trim(),
      reviewedAt: new Date().toISOString(),
    };

    savePostMortem(postMortem);
    onSave?.(postMortem);
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
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">
                Trade Post-Mortem & Execution Review
              </h3>
              <p className="text-xs text-muted-foreground">
                {setup.symbol} {setup.direction} • Confluences: {setup.confluenceTags.join(", ")}
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

        {/* Outcome Summary Strip */}
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-border/80 bg-muted/20 p-3 text-xs">
          <div>
            <p className="text-[11px] text-muted-foreground">Realized Return</p>
            <p
              className={cn(
                "font-mono font-bold text-sm",
                realizedR > 0
                  ? "text-emerald-500"
                  : realizedR < 0
                  ? "text-rose-500"
                  : "text-muted-foreground"
              )}
            >
              {realizedR > 0 ? `+${realizedR}R` : `${realizedR}R`}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Pip Net Movement</p>
            <p
              className={cn(
                "font-mono font-bold text-sm",
                realizedPips > 0 ? "text-emerald-500" : realizedPips < 0 ? "text-rose-500" : "text-muted-foreground"
              )}
            >
              {realizedPips > 0 ? `+${realizedPips} pips` : `${realizedPips} pips`}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Holding Duration</p>
            <p className="font-mono font-bold text-sm text-foreground flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" /> {duration}
            </p>
          </div>
        </div>

        {/* Section 1: Execution Grade Selection */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Execution Quality Grade</span>
            <span className={cn("rounded border px-2 py-0.5 text-[10px] font-mono font-bold", getGradeBadgeColor(grade))}>
              Grade {grade}
            </span>
          </label>
          <div className="grid grid-cols-5 gap-2">
            {GRADES.map((g) => (
              <button
                key={g.grade}
                type="button"
                onClick={() => setGrade(g.grade)}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all",
                  grade === g.grade
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <span className="text-base font-extrabold font-mono">{g.grade}</span>
                <span className="text-[10px] font-semibold text-muted-foreground">{g.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Psychological State */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5 text-sky-500" />
            <span>Psychological Mindset During Trade</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PSYCHOLOGY_OPTIONS.map((p) => (
              <button
                key={p.state}
                type="button"
                onClick={() => setPsychology(p.state)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                  psychology === p.state
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Section 3: Discipline Checklist & Score */}
        <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span>Rule Adherence Checklist</span>
            <span className="font-mono text-primary font-bold">Discipline Score: {disciplineScore}%</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-2 text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rules.planFollowed}
                onChange={(e) => setRules((r) => ({ ...r, planFollowed: e.target.checked }))}
                className="rounded border-border"
              />
              <span>Followed entry playbook rules</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rules.riskManaged}
                onChange={(e) => setRules((r) => ({ ...r, riskManaged: e.target.checked }))}
                className="rounded border-border"
              />
              <span>Proper position sizing limit</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rules.stopHonored}
                onChange={(e) => setRules((r) => ({ ...r, stopHonored: e.target.checked }))}
                className="rounded border-border"
              />
              <span>Honored structural Stop Loss</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rules.targetPatient}
                onChange={(e) => setRules((r) => ({ ...r, targetPatient: e.target.checked }))}
                className="rounded border-border"
              />
              <span>Patient with target execution</span>
            </label>
          </div>
        </div>

        {/* Section 4: Primary Execution Mistake */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Primary Execution Mistake (If Any)
          </label>
          <select
            value={mistake}
            onChange={(e) => setMistake(e.target.value as MistakeCategory)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {MISTAKES.map((m) => (
              <option key={m.category} value={m.category}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Section 5: Retrospective Journal Notes */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-amber-500" />
            <span>Retrospective Notes & Lessons Learned</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="What did the market teach you on this trade? What tactical adjustments will you make next time?"
            className="w-full rounded-lg border border-border bg-background p-2.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
          />
        </div>

        {/* Footer Actions */}
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
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Post-Mortem</span>
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### Why this was written this way:
- **Comprehensive Process Audit:** Unifies the 5 pillars of institutional trade review: Grade, Psychology, Rule Compliance, Root Cause Mistake, and Qualitative Takeaway.
- **Immediate Visual Hierarchy:** Displays real-time realized R-multiples alongside dynamic grade badges.

---

### 3. Upgrade Setup Status Actions (`components/setups/SetupStatusActions.tsx`)
Add the **Post-Mortem Review** button for resolved setups (`TP_REACHED`, `SL_HIT`, `INVALIDATED`).

**File:** `components/setups/SetupStatusActions.tsx`
```tsx
"use client";

import { useState, useEffect, useTransition } from "react";
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Ban, 
  Trash2, 
  Loader2,
  ShieldCheck,
  Award,
} from "lucide-react";
import type { SetupStatus, TradingSetup } from "@/types/setup";
import { updateSetupStatus, deleteTradingSetup, setSetupToBreakeven } from "@/app/actions/setupActions";
import { PreTradeGatekeeperModal } from "@/components/setups/PreTradeGatekeeperModal";
import { TradePostMortemModal } from "@/components/setups/TradePostMortemModal";
import {
  loadAllPostMortems,
  getGradeBadgeColor,
  type TradePostMortem,
} from "@/lib/postMortemUtils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SetupStatusActionsProps {
  setup: TradingSetup;
}

export function SetupStatusActions({ setup }: SetupStatusActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [isGatekeeperOpen, setIsGatekeeperOpen] = useState(false);
  const [isPostMortemOpen, setIsPostMortemOpen] = useState(false);
  const [review, setReview] = useState<TradePostMortem | null>(null);

  // Sync post-mortem reviews from localStorage
  useEffect(() => {
    const allReviews = loadAllPostMortems();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration match pattern
    if (allReviews[setup.id]) setReview(allReviews[setup.id]);
  }, [setup.id]);

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

  // Completed or historical setups (TP_REACHED, SL_HIT, INVALIDATED, EXPIRED)
  return (
    <>
      <div className="flex items-center gap-1.5 ml-auto">
        {/* Post-Mortem Review Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsPostMortemOpen(true)}
          className={cn(
            "h-7 px-2 text-[11px] font-semibold gap-1 transition-colors",
            review
              ? getGradeBadgeColor(review.grade)
              : "border-border text-muted-foreground hover:text-foreground"
          )}
          title="Log Trade Review & Process Grade"
        >
          <Award className="h-3 w-3" />
          {review ? `Grade ${review.grade} (${review.disciplineScore}%)` : "Post-Mortem"}
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

      {/* Trade Post-Mortem Modal */}
      <TradePostMortemModal
        setup={setup}
        isOpen={isPostMortemOpen}
        onClose={() => setIsPostMortemOpen(false)}
        existingReview={review}
        onSave={(saved) => setReview(saved)}
      />
    </>
  );
}
```

---

## 🧪 Verification & Testing
1. Navigate to **`/setups/history`**.
2. Locate any completed setup (e.g., `Won` or `Lost`).
3. Click the **"Post-Mortem"** button in the footer:
   - Verify the **Trade Post-Mortem Modal** opens, showing realized R-multiple, net pip movement, and holding duration.
4. Select an **Execution Quality Grade** (`Grade A`, `B`, `C`, `D`, or `F`).
5. Select a **Psychological Mindset** (e.g. `Disciplined` or `Anxious`).
6. Toggle the **Rule Adherence Checklist** and verify the **Discipline Score (0-100%)** calculates dynamically.
7. Enter reflection notes in the **Retrospective Notes** box and click **"Save Post-Mortem"**.
8. Verify the card button immediately updates to reflect the awarded grade (e.g. `Grade A (95%)`).
9. Run `npx tsc --noEmit` to verify 0 type errors.

