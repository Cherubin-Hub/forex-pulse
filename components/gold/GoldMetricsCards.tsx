"use client";

import { DollarSign, ArrowUpRight, ArrowDownRight, Compass } from "lucide-react";
import type { KeyLevel } from "@/types/gold";
import type { PriceQuote } from "@/types/market";
import { formatPrice } from "@/lib/formatters";

interface GoldMetricsCardsProps {
  quote: PriceQuote | null;
  levels: KeyLevel[];
}

export function GoldMetricsCards({ quote, levels }: GoldMetricsCardsProps) {
  const currentPrice = quote?.price ?? 2650;
  
  // 1. Calculate 24h Dollar Range
  const high = quote?.high ?? currentPrice + 8;
  const low = quote?.low ?? currentPrice - 6;
  const dollarRange = (high - low).toFixed(2);

  // 2. Nearest Resistance & Nearest Support
  const resistances = levels.filter((l) => l.type === "RESISTANCE" && l.price > currentPrice);
  const nearestResistance = [...resistances].sort((a, b) => a.price - b.price)[0];
  const distToRes = nearestResistance ? (nearestResistance.price - currentPrice).toFixed(2) : null;

  const supports = levels.filter((l) => l.type === "SUPPORT" && l.price < currentPrice);
  const nearestSupport = [...supports].sort((a, b) => b.price - a.price)[0];
  const distToSup = nearestSupport ? (currentPrice - nearestSupport.price).toFixed(2) : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 24h Dollar Range */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium">24h Price Range</span>
          <DollarSign className="h-4 w-4 text-amber-500" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <h4 className="text-xl font-bold tracking-tight">${dollarRange}</h4>
          <span className="text-[11px] font-medium text-muted-foreground">
            L: ${formatPrice(low, 2)} — H: ${formatPrice(high, 2)}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Intra-day volatility corridor</p>
      </div>

      {/* Distance to Resistance */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium">Nearest Resistance</span>
          <ArrowUpRight className="h-4 w-4 text-rose-500" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <h4 className="text-xl font-bold tracking-tight">
            ${nearestResistance ? formatPrice(nearestResistance.price, 2) : "—"}
          </h4>
          {distToRes && (
            <span className="text-xs font-semibold text-rose-500">
              +{distToRes} pts
            </span>
          )}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Target or liquidity sweep zone</p>
      </div>

      {/* Distance to Support */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium">Nearest Support</span>
          <ArrowDownRight className="h-4 w-4 text-emerald-500" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <h4 className="text-xl font-bold tracking-tight">
            ${nearestSupport ? formatPrice(nearestSupport.price, 2) : "—"}
          </h4>
          {distToSup && (
            <span className="text-xs font-semibold text-emerald-500">
              -{distToSup} pts
            </span>
          )}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Institutional order block floor</p>
      </div>

      {/* DXY Correlation */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium">USD Correlation (DXY)</span>
          <Compass className="h-4 w-4 text-sky-500" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <h4 className="text-xl font-bold tracking-tight">-0.82</h4>
          <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-bold text-sky-500 border border-sky-500/20">
            Strong Inverse
          </span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Bearish USD yields fuel Gold upside</p>
      </div>
    </div>
  );
}
