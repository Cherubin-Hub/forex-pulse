"use client";

import { useMemo } from "react";
import { AlertTriangle, Layers, Activity } from "lucide-react";
import type { TradingSetup } from "@/types/setup";
import { useSettings } from "@/components/providers/SettingsProvider";
import { calculatePortfolioExposure } from "@/lib/riskUtils";
import { cn } from "@/lib/utils";

interface PortfolioExposureRadarProps {
  activeSetups: TradingSetup[];
}

export function PortfolioExposureRadar({ activeSetups }: PortfolioExposureRadarProps) {
  const { settings, isLoaded } = useSettings();

  const summary = useMemo(() => {
    if (!isLoaded || !settings) return null;
    return calculatePortfolioExposure(activeSetups, settings, 10000);
  }, [activeSetups, settings, isLoaded]);

  if (!isLoaded || !summary) {
    return <div className="h-44 rounded-xl bg-card/50 border border-border animate-pulse" />;
  }

  const isAtCapacity = summary.openSetupsCount >= summary.maxOpenSetups;
  const isHighRisk = summary.totalRiskPercent >= 3.0;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
      {/* Top Header Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Live Portfolio Risk & Exposure Radar
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time aggregate risk across {summary.openSetupsCount} active and pending trading setups.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span
              className={cn(
                "text-base font-bold font-mono",
                isHighRisk ? "text-rose-500" : "text-primary"
              )}
            >
              {summary.totalRiskPercent}%
            </span>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Committed Risk</p>
          </div>

          <div className="text-right">
            <span
              className={cn(
                "text-base font-bold font-mono",
                isAtCapacity ? "text-rose-500" : "text-foreground"
              )}
            >
              {summary.openSetupsCount} / {summary.maxOpenSetups}
            </span>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Capacity</p>
          </div>
        </div>
      </div>

      {/* Capacity Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            Portfolio Capacity Utilization
          </span>
          <span className="font-mono font-medium">{summary.capacityPercent}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-300",
              summary.capacityPercent >= 90
                ? "bg-rose-500"
                : summary.capacityPercent >= 60
                ? "bg-amber-500"
                : "bg-emerald-500"
            )}
            style={{ width: `${summary.capacityPercent}%` }}
          />
        </div>
      </div>

      {/* Correlation Warnings */}
      {summary.correlationWarnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-1">
          {summary.correlationWarnings.map((warn, i) => (
            <p key={i} className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {warn}
            </p>
          ))}
        </div>
      )}

      {/* Net Directional Currency Exposures */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Net Currency Directional Bias
        </p>
        {summary.currencyExposures.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No open market exposures detected.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {summary.currencyExposures.map((exp) => (
              <div
                key={exp.currency}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium",
                  exp.netDirection === "LONG"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : exp.netDirection === "SHORT"
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    : "border-border bg-muted/40 text-muted-foreground"
                )}
              >
                <span className="font-bold">{exp.currency}</span>
                <span className="text-[10px] uppercase font-mono px-1 py-0.2 rounded bg-background/60">
                  {exp.netDirection === "LONG" ? `+${exp.netScore} Long` : `${exp.netScore} Short`}
                </span>
                <span className="text-[10px] text-muted-foreground">({exp.tradeCount} trades)</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
