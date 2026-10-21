"use client";
import { useSettings } from "@/hooks/useSettings";

import { useState, useEffect, useMemo } from "react";
import { Award, Brain, AlertOctagon } from "lucide-react";
import type { TradingSetup } from "@/types/setup";
import {
  type ExecutionGrade,
  type TradePostMortem,
  loadAllPostMortems,
  getGradeBadgeColor,
} from "@/lib/postMortemUtils";
import { calculateDisciplineEdge } from "@/lib/disciplineAnalyticsUtils";
import { cn } from "@/lib/utils";

interface DisciplineEdgeMatrixProps {
  setups: TradingSetup[];
  selectedGrade?: "ALL" | ExecutionGrade;
  onSelectGrade?: (grade: "ALL" | ExecutionGrade) => void;
  reviews?: Record<string, TradePostMortem>;
}

export function DisciplineEdgeMatrix({
  setups,
  selectedGrade = "ALL",
  onSelectGrade,
  reviews: propReviews,
}: DisciplineEdgeMatrixProps) {
  const { identity } = useSettings();
  const [mountedReviews, setMountedReviews] = useState<
    Record<string, TradePostMortem>
  >({});

  // Hydration-safe post-mortem loader
  useEffect(() => {
    if (!propReviews) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration match pattern
      setMountedReviews(loadAllPostMortems(identity?.userId));
    }
  }, [propReviews, identity?.userId]);

  const activeReviews = propReviews ?? mountedReviews;

  const edge = useMemo(() => {
    return calculateDisciplineEdge(setups, activeReviews);
  }, [setups, activeReviews]);

  if (edge.totalReviewed === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-xs text-muted-foreground space-y-1.5">
        <Award className="h-6 w-6 mx-auto opacity-30 text-primary" />
        <p className="font-semibold text-foreground">
          Discipline Edge Analytics
        </p>
        <p>
          Log post-mortem reviews on your resolved trades below to unlock
          execution quality metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            Process Adherence & Discipline Edge Matrix
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Empirical performance correlation: Process Grade vs Financial Return
            across {edge.totalReviewed} reviewed setups.
          </p>
        </div>

        {edge.totalPreventableLeakageR > 0 && (
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-500 font-semibold">
            <AlertOctagon className="h-3.5 w-3.5" />
            <span>Preventable Leakage: -{edge.totalPreventableLeakageR}R</span>
          </div>
        )}
      </div>

      {/* Grade Performance Leaderboard */}
      <div className="grid gap-2 sm:grid-cols-5">
        {edge.gradeMetrics.map((g) => {
          const isSelected = selectedGrade === g.grade;

          return (
            <button
              key={g.grade}
              type="button"
              onClick={() => onSelectGrade?.(isSelected ? "ALL" : g.grade)}
              className={cn(
                "flex flex-col justify-between p-3 rounded-lg border text-left transition-all",
                isSelected
                  ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                  : "border-border/70 bg-muted/20 hover:bg-muted/40",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "rounded border px-1.5 py-0.5 text-[10px] font-mono font-bold",
                    getGradeBadgeColor(g.grade),
                  )}
                >
                  Grade {g.grade}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {g.count} trades
                </span>
              </div>

              <div className="mt-2 space-y-0.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Win Rate:
                  </span>
                  <span className="font-mono text-xs font-bold text-foreground">
                    {g.winRate}%
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Net R:
                  </span>
                  <span
                    className={cn(
                      "font-mono text-xs font-bold",
                      g.totalR > 0
                        ? "text-emerald-500"
                        : g.totalR < 0
                          ? "text-rose-500"
                          : "text-muted-foreground",
                    )}
                  >
                    {g.totalR > 0 ? `+${g.totalR}R` : `${g.totalR}R`}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Insights: Psychology Breakdown & Execution Leakage */}
      <div className="grid sm:grid-cols-2 gap-4 pt-1">
        {/* Psychological Mindset Edge */}
        <div className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <Brain className="h-3.5 w-3.5 text-sky-500" />
            <span>Mindset Return Correlation</span>
          </div>
          <div className="space-y-1.5">
            {edge.psychologyMetrics.map((p) => (
              <div
                key={p.state}
                className="flex items-center justify-between text-[11px]"
              >
                <span className="text-muted-foreground capitalize font-medium">
                  {p.state.toLowerCase()} ({p.count})
                </span>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-muted-foreground">{p.winRate}% WR</span>
                  <span
                    className={cn(
                      "font-bold",
                      p.totalR > 0
                        ? "text-emerald-500"
                        : p.totalR < 0
                          ? "text-rose-500"
                          : "text-muted-foreground",
                    )}
                  >
                    {p.totalR > 0 ? `+${p.totalR}R` : `${p.totalR}R`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unforced Mistakes Leakage Ledger */}
        <div className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <AlertOctagon className="h-3.5 w-3.5 text-rose-500" />
            <span>Cost of Unforced Mistakes</span>
          </div>
          {edge.mistakeLeakages.length === 0 ? (
            <p className="text-[11px] text-muted-foreground py-2">
              Flawless execution! Zero mistake leakages recorded.
            </p>
          ) : (
            <div className="space-y-1.5">
              {edge.mistakeLeakages.map((m) => (
                <div
                  key={m.mistake}
                  className="flex items-center justify-between text-[11px]"
                >
                  <span
                    className="text-muted-foreground truncate max-w-[200px]"
                    title={m.label}
                  >
                    {m.label} ({m.count})
                  </span>
                  <span className="font-mono font-bold text-rose-500">
                    -{m.lostR}R
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
