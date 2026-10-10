"use client";

import { useMemo } from "react";
import { CalendarDays, AlertTriangle, Zap, ShieldAlert } from "lucide-react";
import type { EconomicEvent } from "@/types/calendar";
import { calculateCalendarWeeklyMetrics } from "@/lib/calendar";

interface CalendarMetricsSummaryProps {
  events: EconomicEvent[];
}

export function CalendarMetricsSummary({ events }: CalendarMetricsSummaryProps) {
  const metrics = useMemo(() => calculateCalendarWeeklyMetrics(events), [events]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {/* Total Events */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
          <CalendarDays className="h-3.5 w-3.5" />
          <span className="text-[11px] font-medium uppercase tracking-wider">Total Releases</span>
        </div>
        <p className="text-xl font-bold font-mono">{metrics.totalEvents}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Tracked this week</p>
      </div>

      {/* High-Impact Catalysts */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-1.5 text-rose-500 mb-1">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span className="text-[11px] font-medium uppercase tracking-wider">High Impact</span>
        </div>
        <p className="text-xl font-bold font-mono text-rose-500">{metrics.highImpactCount}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Tier 1 market movers</p>
      </div>

      {/* Primary Currency Driver */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-1.5 text-primary mb-1">
          <Zap className="h-3.5 w-3.5" />
          <span className="text-[11px] font-medium uppercase tracking-wider">Main Driver</span>
        </div>
        <p className="text-xl font-bold font-mono">{metrics.primaryCurrency}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{metrics.primaryCurrencyCount} scheduled releases</p>
      </div>

      {/* Medium Impact */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-1.5 text-amber-500 mb-1">
          <ShieldAlert className="h-3.5 w-3.5" />
          <span className="text-[11px] font-medium uppercase tracking-wider">Medium Impact</span>
        </div>
        <p className="text-xl font-bold font-mono text-amber-500">{metrics.mediumImpactCount}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Secondary catalysts</p>
      </div>
    </div>
  );
}
