"use client";

import { useMemo } from "react";
import { AlertOctagon, Clock, ShieldCheck } from "lucide-react";
import type { EconomicEvent } from "@/types/calendar";
import { useNow } from "@/hooks/useNow";
import { getNextHighImpactEvent, getAffectedInstruments } from "@/lib/calendar";
import { formatClockPHT, formatDuration } from "@/lib/formatters";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      <Card className="glass flex items-center gap-3 border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400 glow-success">
        <ShieldCheck className="h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">Macro Horizon Clear</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            No further high-impact releases scheduled for the remainder of this session.
          </p>
        </div>
      </Card>
    );
  }

  const { event, msUntil } = nextHigh;
  const isImminent = msUntil <= 30 * 60 * 1000; // Less than 30 minutes away
  const affected = getAffectedInstruments(event.currency);

  return (
    <Card
      className={cn(
        "glass p-4 shadow-sm transition-all duration-300",
        isImminent
          ? "border-rose-500/40 bg-rose-500/10 glow-danger"
          : "hover:border-primary/40"
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {isImminent ? (
              <Badge variant="destructive" className="animate-pulse">
                <AlertOctagon className="h-3.5 w-3.5 mr-1" />
                No-Trade Zone Active
              </Badge>
            ) : (
              <Badge variant="warning">
                <Clock className="h-3.5 w-3.5 mr-1" />
                Catalyst Approaching
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {formatClockPHT(event.scheduledAt)} PHT
            </span>
          </div>
          <h3 className="text-base font-bold tracking-tight text-foreground">
            {event.currency} · {event.title}
          </h3>
          <p className="text-xs text-muted-foreground">
            Forecast: <span className="font-mono font-medium text-foreground">{event.forecast ?? "—"}</span>
            {" · "}
            Previous: <span className="font-mono font-medium text-foreground">{event.previous ?? "—"}</span>
          </p>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 border-t sm:border-t-0 border-border pt-2 sm:pt-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isImminent ? "bg-rose-400" : "bg-amber-400")} />
              <span className={cn("relative inline-flex rounded-full h-2 w-2", isImminent ? "bg-rose-500" : "bg-amber-500")} />
            </span>
            <span>Countdown:</span>
          </div>
          <span
            className={cn(
              "font-mono text-xl font-bold tracking-tight financial-num",
              isImminent ? "text-rose-500 animate-pulse" : "text-amber-500"
            )}
          >
            {formatDuration(msUntil)}
          </span>
        </div>
      </div>

      {/* Affected Instruments Strip */}
      {affected.length > 0 && (
        <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Affected:</span>
          <div className="flex flex-wrap gap-1">
            {affected.map((sym) => (
              <span
                key={sym}
                className="rounded border border-border bg-card/60 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground"
              >
                {sym}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
