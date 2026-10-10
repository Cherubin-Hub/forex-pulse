"use client";

import { Target, Layers } from "lucide-react";
import type { PivotLevels } from "@/types/technical";

interface PivotLevelsCardProps {
  symbol: string;
  pivots: PivotLevels;
}

export function PivotLevelsCard({ symbol, pivots }: PivotLevelsCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-xs uppercase tracking-wider">
            Daily Pivot Levels ({symbol})
          </h4>
        </div>
        <span className="text-[10px] text-muted-foreground uppercase font-semibold">
          Floor Trader Standard
        </span>
      </div>

      {/* Grid of Pivot Levels */}
      <div className="grid grid-cols-5 gap-2 text-center text-xs">
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-2">
          <p className="text-[10px] text-muted-foreground font-semibold">S2</p>
          <p className="font-mono font-bold text-rose-500 mt-0.5">{pivots.s2}</p>
        </div>
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-2">
          <p className="text-[10px] text-muted-foreground font-semibold">S1</p>
          <p className="font-mono font-bold text-rose-400 mt-0.5">{pivots.s1}</p>
        </div>
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-2">
          <p className="text-[10px] text-primary font-semibold">PIVOT (P)</p>
          <p className="font-mono font-bold text-foreground mt-0.5">{pivots.pivot}</p>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2">
          <p className="text-[10px] text-muted-foreground font-semibold">R1</p>
          <p className="font-mono font-bold text-emerald-400 mt-0.5">{pivots.r1}</p>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2">
          <p className="text-[10px] text-muted-foreground font-semibold">R2</p>
          <p className="font-mono font-bold text-emerald-500 mt-0.5">{pivots.r2}</p>
        </div>
      </div>

      {/* Daily Volatility Boundaries */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Layers className="h-3.5 w-3.5" />
          <span>Expected Daily Volatility Range:</span>
        </div>
        <div className="font-mono text-[11px] font-semibold space-x-2">
          <span className="text-rose-500">Low: {pivots.projectedLow}</span>
          <span className="text-muted-foreground">—</span>
          <span className="text-emerald-500">High: {pivots.projectedHigh}</span>
        </div>
      </div>
    </div>
  );
}
