"use client";

import { TrendingUp, TrendingDown, Flame, Globe2 } from "lucide-react";
import type { PriceQuote } from "@/types/market";
import { INSTRUMENTS } from "@/lib/constants/instruments";
import { calculateChange, calculateDailyRangePips, formatPercent } from "@/lib/formatters";

interface MarketsSummaryCardsProps {
  quotes: PriceQuote[];
}

export function MarketsSummaryCards({ quotes }: MarketsSummaryCardsProps) {
  const analyzedQuotes = quotes.map((q) => {
    const inst = INSTRUMENTS.find((i) => i.symbol === q.symbol);
    const decimals = inst?.decimals ?? 5;
    const change = calculateChange(q.price, q.previousClose);
    const rangePips = calculateDailyRangePips(q.high, q.low, decimals);
    return { ...q, change, rangePips, displayName: inst?.displayName ?? q.symbol };
  });

  // 1. Top Gainer & Loser
  const validChanges = analyzedQuotes.filter((q) => q.change !== null);
  const topGainer = [...validChanges].sort((a, b) => (b.change?.percent ?? 0) - (a.change?.percent ?? 0))[0];
  const topLoser = [...validChanges].sort((a, b) => (a.change?.percent ?? 0) - (b.change?.percent ?? 0))[0];

  // 2. Highest Volatility
  const mostVolatile = [...analyzedQuotes].sort((a, b) => b.rangePips - a.rangePips)[0];

  // 3. Overall Market Sentiment
  const bullishCount = quotes.filter((q) => q.bias === "BULLISH").length;
  const sentiment = bullishCount >= quotes.length / 2 ? "Risk-On (Bullish USD/Equities)" : "Risk-Off (Defensive Flow)";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Top Gainer */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium">Top Gainer (24h)</span>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <h4 className="text-lg font-bold tracking-tight">{topGainer?.displayName ?? "—"}</h4>
          <span className="text-xs font-semibold text-emerald-500 tabular-nums">
            {topGainer?.change ? formatPercent(topGainer.change.percent) : "0.00%"}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Leading currency pair momentum</p>
      </div>

      {/* Top Loser */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium">Top Loser (24h)</span>
          <TrendingDown className="h-4 w-4 text-rose-500" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <h4 className="text-lg font-bold tracking-tight">{topLoser?.displayName ?? "—"}</h4>
          <span className="text-xs font-semibold text-rose-500 tabular-nums">
            {topLoser?.change ? formatPercent(topLoser.change.percent) : "0.00%"}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Deepest intra-day retracement</p>
      </div>

      {/* Highest Volatility */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium">Most Active Range</span>
          <Flame className="h-4 w-4 text-amber-500" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <h4 className="text-lg font-bold tracking-tight">{mostVolatile?.displayName ?? "—"}</h4>
          <span className="text-xs font-semibold text-amber-500 tabular-nums">
            {mostVolatile?.rangePips} pips
          </span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Maximum daily price expansion</p>
      </div>

      {/* Market Sentiment */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium">Market Regime</span>
          <Globe2 className="h-4 w-4 text-sky-500" />
        </div>
        <div className="mt-2">
          <h4 className="text-sm font-bold tracking-tight truncate">{sentiment}</h4>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">{bullishCount} of {quotes.length} assets with Bullish bias</p>
      </div>
    </div>
  );
}
