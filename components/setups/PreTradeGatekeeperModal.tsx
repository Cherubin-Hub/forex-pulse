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
import type { EconomicEvent } from "@/types/calendar";
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
  events?: EconomicEvent[];
  activeSetups?: TradingSetup[];
}

export function PreTradeGatekeeperModal({
  setup,
  isOpen,
  onClose,
  onConfirm,
  events,
  activeSetups,
}: PreTradeGatekeeperModalProps) {
  const { settings } = useSettings();
  const now = useNow();
  const [isPending, startTransition] = useTransition();

  // Psychology affirmations
  const [affirmedPlan, setAffirmedPlan] = useState(false);
  const [affirmedStopLoss, setAffirmedStopLoss] = useState(false);
  const [affirmedRisk, setAffirmedRisk] = useState(false);
  const [overrideAcknowledged, setOverrideAcknowledged] = useState(false);

  const auditEvents = useMemo(() => {
    return events && events.length > 0 ? events : MOCK_EVENTS;
  }, [events]);

  const auditSetups = useMemo(() => {
    return activeSetups && activeSetups.length > 0 ? activeSetups : MOCK_ACTIVE_SETUPS;
  }, [activeSetups]);

  const audit = useMemo(() => {
    if (!now) return null;
    return evaluatePreTradeAudit(setup, auditEvents, auditSetups, settings, now);
  }, [setup, auditEvents, auditSetups, settings, now]);

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
