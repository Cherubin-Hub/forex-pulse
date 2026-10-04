"use client";

import type { EconomicEvent } from "@/types/calendar";
import { getAffectedInstruments, getEventTiming, getMsUntilEvent } from "@/lib/calendar";
import { formatClockPHT, formatDuration } from "@/lib/formatters";
import { ImpactBadge } from "@/components/calendar/ImpactBadge";
import { cn } from "@/lib/utils";

type EventRowProps = {
  event: EconomicEvent;
  now: Date;
  showAffected?: boolean;
};

export function EventRow({ event, now, showAffected = false }: EventRowProps) {
  const timing = getEventTiming(event, now);
  const msUntil = getMsUntilEvent(event, now);
  const affected = showAffected ? getAffectedInstruments(event.currency) : [];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors",
        timing === "IMMINENT" && "bg-rose-500/10",
        timing === "JUST_RELEASED" && "bg-amber-500/10",
        timing === "RELEASED" && "opacity-50"
      )}
    >
      {/* Time */}
      <div className="w-16 shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">
        {formatClockPHT(event.scheduledAt)}
      </div>

      {/* Main */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold tracking-wide">
            {event.currency}
          </span>
          <ImpactBadge impact={event.impact} />
          <p className="truncate text-sm font-medium">{event.title}</p>
        </div>

        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums text-muted-foreground">
          <span>Actual: <span className="font-medium text-foreground">{event.actual ?? "—"}</span></span>
          <span>Forecast: {event.forecast ?? "—"}</span>
          <span>Previous: {event.previous ?? "—"}</span>
        </div>

        {affected.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {affected.map((symbol) => (
              <span key={symbol} className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {symbol}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Countdown / status */}
      <div className="shrink-0 text-right text-xs font-medium tabular-nums">
        {timing === "UPCOMING" && <span className="text-muted-foreground">in {formatDuration(msUntil)}</span>}
        {timing === "IMMINENT" && <span className="text-rose-600 dark:text-rose-400">in {formatDuration(msUntil)}</span>}
        {timing === "JUST_RELEASED" && <span className="text-amber-600 dark:text-amber-400">Just released</span>}
        {timing === "RELEASED" && <span className="text-muted-foreground">Released</span>}
      </div>
    </div>
  );
}
