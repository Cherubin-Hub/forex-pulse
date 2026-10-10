"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, Activity, PlusCircle } from "lucide-react";
import type { TechnicalAnalysis, Timeframe, TrendDirection } from "@/types/technical";
import type { PriceQuote } from "@/types/market";
import { calculateConfluenceScore, calculateDailyPivots } from "@/lib/technicalUtils";
import { PivotLevelsCard } from "@/components/technical/PivotLevelsCard";
import { TradingViewWidget } from "@/components/charts/TradingViewWidget";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TIMEFRAMES: Timeframe[] = ["D1", "H4", "H1", "M15"];

function getTrendColor(trend: TrendDirection) {
  if (trend === "BULLISH") return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  if (trend === "BEARISH") return "bg-rose-500/10 text-rose-500 border-rose-500/20";
  return "bg-slate-500/10 text-slate-500 border-slate-500/20";
}

function TrendIcon({ trend, className }: { trend: TrendDirection; className?: string }) {
  if (trend === "BULLISH") return <TrendingUp className={className} />;
  if (trend === "BEARISH") return <TrendingDown className={className} />;
  return <Minus className={className} />;
}

interface TechnicalConsoleProps {
  technicals: TechnicalAnalysis[];
  quotes: PriceQuote[];
}

export function TechnicalConsole({ technicals, quotes }: TechnicalConsoleProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<string>("EURUSD");

  const activeTech = useMemo(() => {
    return technicals.find((t) => t.symbol === selectedSymbol) ?? technicals[0];
  }, [technicals, selectedSymbol]);

  const activeQuote = useMemo(() => {
    return quotes.find((q) => q.symbol === selectedSymbol) ?? quotes[0];
  }, [quotes, selectedSymbol]);

  const confluence = useMemo(() => {
    return activeTech ? calculateConfluenceScore(activeTech) : null;
  }, [activeTech]);

  const pivots = useMemo(() => {
    if (!activeQuote || !activeTech) return null;
    const atr = activeTech.timeframes.D1.atr;
    return calculateDailyPivots(activeQuote, atr);
  }, [activeQuote, activeTech]);

  return (
    <div className="space-y-6">
      {/* MTF Matrix Table */}
      <div className="w-full overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-muted/50 text-muted-foreground border-b border-border text-xs">
            <tr>
              <th className="px-5 py-3 font-medium">Instrument</th>
              {TIMEFRAMES.map((tf) => (
                <th key={tf} className="px-5 py-3 font-medium text-center">
                  {tf}
                </th>
              ))}
              <th className="px-5 py-3 font-medium text-right">Overall Bias</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {technicals.map((row) => {
              const isSelected = row.symbol === selectedSymbol;

              return (
                <tr
                  key={row.symbol}
                  onClick={() => setSelectedSymbol(row.symbol)}
                  className={cn(
                    "cursor-pointer transition-colors",
                    isSelected ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-muted/20"
                  )}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold tracking-tight">{row.symbol}</span>
                      {isSelected && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </div>
                  </td>

                  {TIMEFRAMES.map((tf) => {
                    const indicator = row.timeframes[tf];
                    const trendColor = getTrendColor(indicator.emaTrend);

                    return (
                      <td key={tf} className="px-5 py-3 text-center">
                        <div
                          className={cn(
                            "inline-flex flex-col items-center justify-center p-1.5 rounded-md border min-w-[70px]",
                            trendColor
                          )}
                        >
                          <div className="flex items-center gap-1">
                            <TrendIcon trend={indicator.emaTrend} className="h-3.5 w-3.5" />
                            <span className="text-[11px] font-bold">{indicator.emaTrend[0]}</span>
                          </div>
                          <span className="text-[10px] opacity-75 font-mono">
                            RSI {indicator.rsi}
                          </span>
                        </div>
                      </td>
                    );
                  })}

                  <td className="px-5 py-3 text-right">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold",
                        getTrendColor(row.overallBias)
                      )}
                    >
                      <TrendIcon trend={row.overallBias} className="h-3.5 w-3.5" />
                      {row.overallBias}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected Pair Analysis Toolbar */}
      {activeTech && confluence && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-sm">
                Active Analysis Focus: {activeTech.symbol}
              </h3>
              <span
                className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full border",
                  confluence.dominantTrend === "BULLISH"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                    : confluence.dominantTrend === "BEARISH"
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-500"
                    : "border-border bg-muted/40 text-muted-foreground"
                )}
              >
                {confluence.alignmentLabel} ({confluence.scorePercent}%)
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Multi-timeframe confirmation across Daily, H4, and Hourly charts.
            </p>
          </div>

          <Link
            href="/setups"
            className={cn(
              buttonVariants({ size: "sm", variant: "default" }),
              "gap-1.5 text-xs font-semibold shrink-0"
            )}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Create Setup for {activeTech.symbol}
          </Link>
        </div>
      )}

      {/* Daily Pivot Levels Card */}
      {pivots && <PivotLevelsCard symbol={selectedSymbol} pivots={pivots} />}

      {/* Synchronized TradingView Chart */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Live Candlestick Chart: {selectedSymbol}
          </h3>
          <span className="text-xs text-muted-foreground">Interactive TradingView Feed</span>
        </div>
        <TradingViewWidget symbol={selectedSymbol} height={520} />
      </div>
    </div>
  );
}
