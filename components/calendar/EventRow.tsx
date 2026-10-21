"use client";

import type { EconomicEvent } from "@/types/calendar";
import {
  getAffectedInstruments,
  getEventTiming,
  getMsUntilEvent,
  getEventSurprise,
} from "@/lib/calendar";
import { formatClockPHT, formatDuration } from "@/lib/formatters";
import { ImpactBadge } from "@/components/calendar/ImpactBadge";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/useSettings";
import { getNewsWindows } from "@/lib/settings";

type EventRowProps = {
  event: EconomicEvent;
  now: Date;
  showAffected?: boolean;
};

export function EventRow({ event, now, showAffected = false }: EventRowProps) {
  const { settings } = useSettings();
  const timing = getEventTiming(event, now, getNewsWindows(settings));
  const msUntil = getMsUntilEvent(event, now);
  const affected = showAffected ? getAffectedInstruments(event.currency) : [];

  const resolvedEvent = event;

  const surpriseInfo = getEventSurprise(resolvedEvent);

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors",
        timing === "IMMINENT" && "bg-rose-500/10",
        timing === "JUST_RELEASED" && "bg-amber-500/10",
        timing === "RELEASED" && "opacity-60 hover:opacity-100",
      )}
    >
      {/* Time */}
      <div className="w-16 shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground font-mono">
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

        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums text-muted-foreground">
          {/* Actual with surprise deviation & sentiment highlight */}
          <span className="flex items-center gap-1">
            <span>Actual:</span>
            {resolvedEvent.actual && resolvedEvent.actual !== "—" ? (
              <span
                className={cn(
                  "font-semibold font-mono",
                  surpriseInfo.colorClass,
                )}
              >
                {resolvedEvent.actual}
              </span>
            ) : timing === "UPCOMING" || timing === "IMMINENT" ? (
              <span className="text-muted-foreground/60 italic text-[11px]">
                Pending
              </span>
            ) : (
              <span className="font-medium text-foreground">—</span>
            )}

            {surpriseInfo.badgeLabel &&
              surpriseInfo.surprise !== "IN_LINE" &&
              surpriseInfo.surprise !== "NEUTRAL" &&
              surpriseInfo.surprise !== "PENDING" && (
                <span
                  className={cn(
                    "ml-1 rounded px-1 py-0.5 text-[9px] font-mono leading-none border",
                    surpriseInfo.isBeat &&
                      "bg-emerald-500/15 text-emerald-500 border-emerald-500/30 font-bold",
                    surpriseInfo.isMiss &&
                      "bg-rose-500/15 text-rose-500 border-rose-500/30 font-bold",
                  )}
                >
                  {surpriseInfo.badgeLabel}
                </span>
              )}
          </span>

          <span>Forecast: {event.forecast ?? "—"}</span>
          <span>Previous: {event.previous ?? "—"}</span>
        </div>

        {affected.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {affected.map((symbol) => (
              <span
                key={symbol}
                className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {symbol}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Countdown / status */}
      <div className="shrink-0 text-right text-xs font-medium tabular-nums">
        {timing === "UPCOMING" && (
          <span className="text-muted-foreground font-mono">
            in {formatDuration(msUntil)}
          </span>
        )}
        {timing === "IMMINENT" && (
          <span className="text-rose-600 dark:text-rose-400 font-bold font-mono">
            in {formatDuration(msUntil)}
          </span>
        )}
        {timing === "JUST_RELEASED" && (
          <span className="inline-flex items-center gap-1 text-amber-500 font-semibold animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Just released
          </span>
        )}
        {timing === "RELEASED" && (
          <span className="text-muted-foreground">Released</span>
        )}
      </div>
    </div>
  );
}
