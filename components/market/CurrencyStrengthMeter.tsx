"use client";

import { useMemo } from "react";
import { Zap, Layers } from "lucide-react";
import type { PriceQuote } from "@/types/market";
import { calculateCurrencyStrengths, type CurrencyStrength } from "@/lib/correlationUtils";
import { cn } from "@/lib/utils";
import { useLiveMarket } from "@/components/providers/AutoTradeAutomationProvider";

interface CurrencyStrengthMeterProps {
  quotes: PriceQuote[];
}

export function CurrencyStrengthMeter({ quotes: initialQuotes }: CurrencyStrengthMeterProps) {
  const { quotes: liveQuotes } = useLiveMarket();
  const quotes = liveQuotes.length > 0 ? liveQuotes : initialQuotes;
  const { strengths, divergence } = useMemo(() => {
    return calculateCurrencyStrengths(quotes);
  }, [quotes]);

  const getStrengthColor = (bias: CurrencyStrength["bias"]) => {
    switch (bias) {
      case "STRONG":
        return "bg-emerald-500 text-white";
      case "BULLISH":
        return "bg-emerald-500/70 text-white";
      case "NEUTRAL":
        return "bg-muted-foreground/60 text-white";
      case "BEARISH":
        return "bg-rose-500/70 text-white";
      case "WEAK":
        return "bg-rose-500 text-white";
    }
  };

  const getBadgeColor = (bias: CurrencyStrength["bias"]) => {
    switch (bias) {
      case "STRONG":
        return "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
      case "BULLISH":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "NEUTRAL":
        return "bg-muted text-muted-foreground border-border";
      case "BEARISH":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "WEAK":
        return "bg-rose-500/15 text-rose-500 border-rose-500/30";
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Relative Currency Strength Meter (CSI)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Normalized 8-currency relative momentum basket from intraday price changes.
          </p>
        </div>

        {divergence && (
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-primary font-semibold">
            <Zap className="h-3.5 w-3.5 fill-primary" />
            <span>Top Divergence: {divergence.recommendedPair}</span>
          </div>
        )}
      </div>

      {/* Divergence Opportunity Callout */}
      {divergence && (
        <div className="rounded-lg border border-border/80 bg-muted/20 p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary font-bold font-mono text-[11px]">
              FX
            </span>
            <div>
              <p className="font-semibold text-foreground">
                Macro Momentum Edge: {divergence.strongest.currency} vs {divergence.weakest.currency}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {divergence.rationale}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono shrink-0">
            <span className="text-muted-foreground">Spread Delta:</span>
            <span className="font-bold text-foreground">+{divergence.divergenceSpread} pts</span>
          </div>
        </div>
      )}

      {/* Currency Strength Grid */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 pt-1">
        {strengths.map((s, index) => (
          <div
            key={s.currency}
            className="flex flex-col justify-between rounded-lg border border-border/60 bg-muted/30 p-2.5 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs text-muted-foreground">#{index + 1}</span>
                <span className="font-bold text-sm font-mono">{s.currency}</span>
              </div>
              <span
                className={cn(
                  "rounded border px-1.5 py-0.5 text-[10px] font-bold font-mono uppercase",
                  getBadgeColor(s.bias)
                )}
              >
                {s.bias}
              </span>
            </div>

            {/* Strength Bar */}
            <div className="space-y-1">
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted border border-border/40">
                <div
                  className={cn("h-full transition-all duration-300", getStrengthColor(s.bias))}
                  style={{ width: `${s.barPercentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                <span>Score: {s.normalizedScore > 0 ? `+${s.normalizedScore}` : s.normalizedScore}</span>
                <span>{s.score > 0 ? `+${s.score}%` : `${s.score}%`}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
