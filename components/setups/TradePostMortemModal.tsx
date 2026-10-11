"use client";

import { useState, useEffect } from "react";
import {
  Award,
  Brain,
  BookOpen,
  Save,
  X,
  Clock,
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
