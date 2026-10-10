"use client";

import { useTransition } from "react";
import { motion } from "framer-motion";
import { 
  ShieldAlert, 
  Target, 
  Flame, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus,
  Trash2,
  Loader2
} from "lucide-react";
import type { SessionReport, MarketBias, VolatilityExpectation } from "@/types/report";
import { formatTimePHT } from "@/lib/formatters";
import { deleteSessionReport } from "@/app/actions/reportActions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function getBiasBadge(bias: MarketBias) {
  switch (bias) {
    case "BULLISH_USD":
      return { label: "Bullish USD", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" };
    case "BEARISH_USD":
      return { label: "Bearish USD", color: "bg-rose-500/10 text-rose-500 border-rose-500/20" };
    case "RISK_OFF":
      return { label: "Risk-Off Flight", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" };
    case "RISK_ON":
      return { label: "Risk-On Expansion", color: "bg-sky-500/10 text-sky-500 border-sky-500/20" };
    default:
      return { label: "Neutral / Ranging", color: "bg-slate-500/10 text-slate-500 border-slate-500/20" };
  }
}

function getVolatilityBadge(vol: VolatilityExpectation) {
  switch (vol) {
    case "EXTREME":
      return { label: "Extreme Volatility", color: "text-rose-500" };
    case "HIGH":
      return { label: "High Volatility", color: "text-amber-500" };
    case "NORMAL":
      return { label: "Normal Volatility", color: "text-sky-500" };
    default:
      return { label: "Low Volatility", color: "text-muted-foreground" };
  }
}

export function ReportCard({ report }: { report: SessionReport }) {
  const [isDeleting, startDelete] = useTransition();
  const biasBadge = getBiasBadge(report.bias);
  const volBadge = getVolatilityBadge(report.volatility);

  const handleDelete = () => {
    if (!confirm("Are you sure you want to delete this session report?")) return;
    startDelete(async () => {
      const result = await deleteSessionReport(report.id);
      if (!result.success) {
        alert(`Failed to delete: ${result.error}`);
      }
    });
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm"
    >
      {/* Header Meta */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold tracking-tight">{report.title}</h3>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <Clock className="h-3.5 w-3.5" />
            Generated {formatTimePHT(report.timestamp)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-md border px-2.5 py-1 text-xs font-semibold", biasBadge.color)}>
            {biasBadge.label}
          </span>
          <span className={cn("flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs font-semibold", volBadge.color)}>
            <Flame className="h-3.5 w-3.5" />
            {volBadge.label}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            title="Delete Session Report"
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="rounded-lg bg-muted/40 p-4 border border-border/60">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
          Executive Brief
        </h4>
        <p className="text-sm leading-relaxed text-foreground">
          {report.executiveSummary}
        </p>
      </div>

      {/* Grid: Macro Catalysts & Session Playbook */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Macro Catalysts */}
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary text-xs">⚡</span>
            Key Macro Catalysts
          </h4>
          <ul className="space-y-2">
            {report.macroCatalysts.map((catalyst, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                <span className="text-primary font-bold">•</span>
                <span>{catalyst}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Execution Playbook */}
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <Target className="h-4 w-4 text-primary" />
            Session Playbook
          </h4>
          
          <div className="space-y-2.5 rounded-lg border border-border bg-card p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Focus Pairs:</span>
              <div className="flex gap-1">
                {report.playbook.focusPairs.map((p) => (
                  <span key={p} className="rounded bg-muted px-1.5 py-0.5 font-mono font-semibold">
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <div className="border-t border-border/60 pt-2">
              <span className="font-semibold text-rose-500 flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5" /> Risk Directive:
              </span>
              <p className="text-muted-foreground mt-0.5">{report.playbook.riskRule}</p>
            </div>

            <div className="border-t border-border/60 pt-2">
              <span className="font-semibold text-foreground">Setups in Play:</span>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                {report.playbook.tradeOpportunities.map((op, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-sky-500">→</span>
                    <span>{op}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Watchlist Key Levels Table */}
      <div className="space-y-3 border-t border-border pt-4">
        <h4 className="text-sm font-semibold">Session Key Pivot Levels</h4>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-2.5 font-medium">Instrument</th>
                <th className="p-2.5 font-medium">Support</th>
                <th className="p-2.5 font-medium">Session Pivot</th>
                <th className="p-2.5 font-medium">Resistance</th>
                <th className="p-2.5 font-medium">Trend Bias</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {report.keyLevels.map((lvl) => {
                const isBull = lvl.bias === "BULLISH";
                const isBear = lvl.bias === "BEARISH";
                return (
                  <tr key={lvl.symbol} className="hover:bg-muted/20">
                    <td className="p-2.5 font-semibold font-mono">{lvl.symbol}</td>
                    <td className="p-2.5 font-mono text-emerald-500">{lvl.support}</td>
                    <td className="p-2.5 font-mono font-medium">{lvl.pivot}</td>
                    <td className="p-2.5 font-mono text-rose-500">{lvl.resistance}</td>
                    <td className="p-2.5">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium",
                        isBull && "text-emerald-500 bg-emerald-500/10",
                        isBear && "text-rose-500 bg-rose-500/10",
                        !isBull && !isBear && "text-muted-foreground bg-muted"
                      )}>
                        {isBull && <ArrowUpRight className="h-3 w-3" />}
                        {isBear && <ArrowDownRight className="h-3 w-3" />}
                        {!isBull && !isBear && <Minus className="h-3 w-3" />}
                        {lvl.bias}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.article>
  );
}
