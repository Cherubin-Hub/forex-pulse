"use client";

import { motion } from "framer-motion";
import { Trophy, TrendingUp, Percent, Hash } from "lucide-react";
import type { SetupAnalytics } from "@/lib/analyticsUtils";
import { cn } from "@/lib/utils";

export function SetupAnalyticsSummary({ analytics }: { analytics: SetupAnalytics }) {
  const winPercent = analytics.completedTrades > 0 
    ? (analytics.wins / analytics.completedTrades) * 100 
    : 0;
  const lossPercent = analytics.completedTrades > 0 
    ? (analytics.losses / analytics.completedTrades) * 100 
    : 0;

  return (
    <div className="space-y-4">
      {/* 4-Stat Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Win Rate */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Win Rate</span>
            <Percent className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">
              {analytics.winRate}%
            </span>
            <span className="text-xs text-muted-foreground">
              ({analytics.wins}W - {analytics.losses}L)
            </span>
          </div>
        </motion.div>

        {/* Net R-Multiple */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Net Return (R)</span>
            <TrendingUp className={cn("h-4 w-4", analytics.netR >= 0 ? "text-emerald-500" : "text-rose-500")} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={cn("text-2xl font-bold tracking-tight", analytics.netR >= 0 ? "text-emerald-500" : "text-rose-500")}>
              {analytics.netR > 0 ? `+${analytics.netR}R` : `${analytics.netR}R`}
            </span>
            <span className="text-xs text-muted-foreground">
              Profit Factor: {analytics.profitFactor}
            </span>
          </div>
        </motion.div>

        {/* Average Risk:Reward */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Avg Risk : Reward</span>
            <Trophy className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">
              1:{analytics.avgRiskReward}
            </span>
            <span className="text-xs text-muted-foreground">Plan Average</span>
          </div>
        </motion.div>

        {/* Total Setups Logged */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.15 }}
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total Logged</span>
            <Hash className="h-4 w-4 text-sky-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">
              {analytics.totalTrades}
            </span>
            <span className="text-xs text-muted-foreground">
              {analytics.invalidated} Invalidated
            </span>
          </div>
        </motion.div>
      </div>

      {/* Visual Outcome Breakdown Bar */}
      {analytics.completedTrades > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Execution Distribution</span>
            <span>{analytics.completedTrades} Completed Trades</span>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              style={{ width: `${winPercent}%` }}
              className="bg-emerald-500 transition-all duration-500"
              title={`Won: ${analytics.wins} (${winPercent.toFixed(1)}%)`}
            />
            <div
              style={{ width: `${lossPercent}%` }}
              className="bg-rose-500 transition-all duration-500"
              title={`Lost: ${analytics.losses} (${lossPercent.toFixed(1)}%)`}
            />
          </div>
          <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Take Profit ({winPercent.toFixed(0)}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>Stop Loss ({lossPercent.toFixed(0)}%)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
