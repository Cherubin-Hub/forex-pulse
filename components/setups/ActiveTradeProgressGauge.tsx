"use client";

import { AlertTriangle, Sparkles } from "lucide-react";
import type { TradingSetup } from "@/types/setup";
import type { PriceQuote } from "@/types/market";
import { formatPrice } from "@/lib/formatters";
import {
  calculateActiveTradeMetrics,
  calculatePendingTradeProximity,
} from "@/lib/tradeProgressUtils";
import { cn } from "@/lib/utils";

interface ActiveTradeProgressGaugeProps {
  setup: TradingSetup;
  quote?: PriceQuote | null;
}

export function ActiveTradeProgressGauge({ setup, quote }: ActiveTradeProgressGaugeProps) {


  if (!quote || quote.price === null) return null;

  const isTriggered = setup.status === "ENTRY_TRIGGERED";
  const isPendingConfirmation = setup.status === "WAITING_FOR_CONFIRMATION";

  // Pending setup proximity display
  if (isPendingConfirmation) {
    const proximity = calculatePendingTradeProximity(setup, quote);
    if (!proximity) return null;

    return (
      <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-2.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">Entry Proximity</span>
          <span className="font-mono text-[11px] tabular-nums font-semibold">
            Mark: {formatPrice(proximity.currentPrice, proximity.multiplier === 10 ? 2 : proximity.multiplier === 100 ? 3 : 5)}
          </span>
        </div>

        <div className="mt-1.5 flex items-center justify-between">
          {proximity.isInsideZone ? (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-500">
              <Sparkles className="h-3 w-3" /> Inside Entry Zone (Ready)
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              {proximity.pipsFromZone} pips {proximity.directionToZone.toLowerCase()} entry zone
            </span>
          )}

          <span className="text-[10px] text-muted-foreground font-mono">
            Zone: {formatPrice(proximity.entryMin, proximity.multiplier === 10 ? 2 : proximity.multiplier === 100 ? 3 : 5)} - {formatPrice(proximity.entryMax, proximity.multiplier === 10 ? 2 : proximity.multiplier === 100 ? 3 : 5)}
          </span>
        </div>
      </div>
    );
  }

  // Active triggered trade gauge
  if (!isTriggered) return null;

  const metrics = calculateActiveTradeMetrics(setup, quote);
  if (!metrics) return null;

  // Convert -100% to +100% progress to 0% - 100% gauge position
  // 0% on gauge = Stop Loss, 50% = Entry Midpoint, 100% = Take Profit 1
  let gaugePosition = 50;
  if (metrics.progressPercent >= 0) {
    gaugePosition = 50 + (metrics.progressPercent / 100) * 50;
  } else {
    gaugePosition = 50 + (metrics.progressPercent / 100) * 50;
  }
  gaugePosition = Math.max(2, Math.min(98, gaugePosition));

  return (
    <div className="mt-3.5 space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3">
      {/* Top Status & Live Mark Row */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-semibold">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] font-bold",
              metrics.floatingR >= 0
                ? "bg-emerald-500/15 text-emerald-500"
                : "bg-rose-500/15 text-rose-500"
            )}
          >
            {metrics.floatingR >= 0 ? `+${metrics.floatingR}R` : `${metrics.floatingR}R`}
          </span>
          <span className="text-[11px] text-muted-foreground font-normal">
            ({metrics.pnlPips >= 0 ? `+${metrics.pnlPips}` : metrics.pnlPips} pips)
          </span>
        </div>

        <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
          <span>Mark:</span>
          <span className="font-semibold text-foreground tabular-nums">
            {formatPrice(metrics.currentPrice, metrics.decimals)}
          </span>
        </div>
      </div>

      {/* Progress Track Gauge */}
      <div className="space-y-1">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted border border-border/40">
          {/* SL Zone (Red gradient) */}
          <div className="absolute inset-y-0 left-0 w-1/2 bg-rose-500/25" />
          {/* TP Zone (Green gradient) */}
          <div className="absolute inset-y-0 right-0 w-1/2 bg-emerald-500/25" />
          {/* Midpoint divider (Entry) */}
          <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-border" />

          {/* Current Position Marker */}
          <div
            className={cn(
              "absolute top-0 bottom-0 w-2.5 -translate-x-1/2 rounded-full shadow-sm transition-all duration-300",
              metrics.floatingR >= 0 ? "bg-emerald-500 ring-2 ring-emerald-500/30" : "bg-rose-500 ring-2 ring-rose-500/30"
            )}
            style={{ left: `${gaugePosition}%` }}
          />
        </div>

        {/* Labels below gauge */}
        <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
          <span className="text-rose-500 font-medium">SL ({metrics.pipsToStop}p)</span>
          <span className="text-muted-foreground">Entry</span>
          <span className="text-emerald-500 font-medium">TP1 ({metrics.pipsToTarget}p)</span>
        </div>
      </div>

      {/* Warning Alert if Stop Imminent */}
      {metrics.protectionStatus === "STOP_IMMINENT" && (
        <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-medium text-rose-500">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Risk Warning: Market within {metrics.pipsToStop} pips of Stop Loss.</span>
        </div>
      )}
    </div>
  );
}
