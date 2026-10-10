"use client";

import { useMemo } from "react";
import { AlertOctagon, Clock, ShieldCheck, Flame } from "lucide-react";
import type { EconomicEvent } from "@/types/calendar";
import { useNow } from "@/hooks/useNow";
import { getNextHighImpactEvent, getAffectedInstruments } from "@/lib/calendar";
import { formatClockPHT, formatDuration } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface EventCountdownRadarProps {
  events: EconomicEvent[];
}

export function EventCountdownRadar({ events }: EventCountdownRadarProps) {
  const now = useNow();

  const nextHigh = useMemo(() => {
    if (!now) return null;
    return getNextHighImpactEvent(events, now);
  }, [events, now]);

  if (!now) {
    return <div className="h-32 rounded-xl bg-card/50 border border-border animate-pulse" />;
  }

  if (!nextHigh) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400">
        <ShieldCheck className="h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">Macro Horizon Clear</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            No further high-impact releases scheduled for the remainder of this session.
          </p>
        </div>
      </div>
    );
  }

  const { event, msUntil } = nextHigh;
  const isImminent = msUntil <= 30 * 60 * 1000; // Less than 30 minutes away
  const affected = getAffectedInstruments(event.currency);

  return (
    <div
      className={cn(
        "rounded-xl border p-4 shadow-sm transition-all",
        isImminent
          ? "border-rose-500/40 bg-rose-500/10 dark:bg-rose-950/20"
          : "border-border bg-card"
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {isImminent ? (
              <span className="flex items-center gap-1.5 rounded-md bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white uppercase tracking-wider animate-pulse">
                <AlertOctagon className="h-3.5 w-3.5" />
                No-Trade Zone Active
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary uppercase tracking-wider">
                <Flame className="h-3.5 w-3.5" />
                Next High-Impact Catalyst
              </span>
            )}
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono font-bold">
              {event.currency}
            </span>
          </div>

          <h3 className="text-base font-bold tracking-tight text-foreground">
            {event.title}
          </h3>

          <p className="text-xs text-muted-foreground">
            Scheduled at {formatClockPHT(event.scheduledAt)} (PHT) • Forecast:{" "}
            <span className="font-semibold text-foreground">{event.forecast ?? "N/A"}</span> • Previous:{" "}
            <span className="font-semibold text-foreground">{event.previous ?? "N/A"}</span>
          </p>
        </div>

        {/* Live Countdown Badge */}
        <div className="flex flex-col sm:items-end justify-center shrink-0">
          <div className="flex items-center gap-1.5">
            <Clock className={cn("h-4 w-4", isImminent ? "text-rose-500" : "text-muted-foreground")} />
            <span
              className={cn(
                "text-xl font-extrabold font-mono",
                isImminent ? "text-rose-500" : "text-primary"
              )}
            >
              in {formatDuration(msUntil)}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">Time Until Release</span>
        </div>
      </div>

      {/* Affected Instruments Chips */}
      {affected.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground mr-1">
            Expected Volatility in:
          </span>
          {affected.map((pair) => (
            <span
              key={pair}
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold border",
                isImminent
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  : "border-border bg-muted/40 text-muted-foreground"
              )}
            >
              {pair}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
