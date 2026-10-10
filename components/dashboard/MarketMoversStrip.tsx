"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Activity, DollarSign } from "lucide-react";
import type { PriceQuote } from "@/types/market";
import { calculateMarketMovers } from "@/lib/dashboardUtils";
import { cn } from "@/lib/utils";

interface MarketMoversStripProps {
  quotes: PriceQuote[];
}

export function MarketMoversStrip({ quotes }: MarketMoversStripProps) {
  const movers = useMemo(() => calculateMarketMovers(quotes), [quotes]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {/* Top Gainer */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground mb-1">
          <span className="text-[11px] font-medium uppercase tracking-wider">Top Gainer (24h)</span>
          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
        </div>
        {movers.topGainer ? (
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-sm">{movers.topGainer.symbol}</span>
              <span className="text-xs font-bold font-mono text-emerald-500">
                +{movers.topGainer.changePercent}%
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">{movers.topGainer.currentPrice}</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">Flat market</p>
        )}
      </div>

      {/* Top Decliner */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground mb-1">
          <span className="text-[11px] font-medium uppercase tracking-wider">Top Decliner (24h)</span>
          <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
        </div>
        {movers.topDecliner ? (
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-sm">{movers.topDecliner.symbol}</span>
              <span className="text-xs font-bold font-mono text-rose-500">
                {movers.topDecliner.changePercent}%
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">{movers.topDecliner.currentPrice}</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">Flat market</p>
        )}
      </div>

      {/* Highest Volatility */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground mb-1">
          <span className="text-[11px] font-medium uppercase tracking-wider">High Volatility</span>
          <Activity className="h-3.5 w-3.5 text-primary" />
        </div>
        {movers.mostVolatile ? (
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-sm">{movers.mostVolatile.symbol}</span>
              <span className="text-xs font-bold font-mono text-primary">
                {movers.mostVolatile.spreadPercent}% Spread
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">Daily High/Low Range</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">Calm volatility</p>
        )}
      </div>

      {/* Aggregate USD Bias */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground mb-1">
          <span className="text-[11px] font-medium uppercase tracking-wider">USD Macro Bias</span>
          <DollarSign className="h-3.5 w-3.5 text-amber-500" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              "font-bold text-sm font-mono",
              movers.aggregateUsdBias === "BULLISH"
                ? "text-emerald-500"
                : movers.aggregateUsdBias === "BEARISH"
                ? "text-rose-500"
                : "text-muted-foreground"
            )}
          >
            {movers.aggregateUsdBias}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground">Cross-currency strength</p>
      </div>
    </div>
  );
}
