"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import type { TechnicalAnalysis, Timeframe, TrendDirection } from "@/types/technical";
import { cn } from "@/lib/utils";

const TIMEFRAMES: Timeframe[] = ["D1", "H4", "H1", "M15"];

// Helper to get colors based on trend
function getTrendColor(trend: TrendDirection) {
  if (trend === "BULLISH") return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  if (trend === "BEARISH") return "bg-rose-500/10 text-rose-500 border-rose-500/20";
  return "bg-slate-500/10 text-slate-500 border-slate-500/20";
}

// Helper to get icon based on trend
function TrendIcon({ trend, className }: { trend: TrendDirection; className?: string }) {
  if (trend === "BULLISH") return <TrendingUp className={className} />;
  if (trend === "BEARISH") return <TrendingDown className={className} />;
  return <Minus className={className} />;
}

export function MTFMatrix({ data }: { data: TechnicalAnalysis[] }) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-muted/50 text-muted-foreground border-b border-border">
          <tr>
            <th className="px-6 py-4 font-medium">Instrument</th>
            {TIMEFRAMES.map(tf => (
              <th key={tf} className="px-6 py-4 font-medium text-center">{tf}</th>
            ))}
            <th className="px-6 py-4 font-medium text-right">Overall Bias</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((row, index) => (
            <motion.tr 
              key={row.symbol}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="hover:bg-muted/20 transition-colors"
            >
              {/* Symbol */}
              <td className="px-6 py-4 font-bold tracking-tight">
                {row.symbol}
              </td>

              {/* Timeframes */}
              {TIMEFRAMES.map(tf => {
                const indicator = row.timeframes[tf];
                const trendColor = getTrendColor(indicator.emaTrend);
                
                return (
                  <td key={tf} className="px-6 py-4 text-center">
                    <div className={cn("inline-flex flex-col items-center justify-center p-2 rounded-lg border min-w-[80px]", trendColor)}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <TrendIcon trend={indicator.emaTrend} className="h-4 w-4" />
                        <span className="font-semibold text-xs">{indicator.emaTrend.substring(0,4)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] opacity-80 font-medium">
                        <span className="flex items-center gap-0.5" title="RSI">
                          <Activity className="h-3 w-3" /> {indicator.rsi}
                        </span>
                      </div>
                    </div>
                  </td>
                );
              })}

              {/* Overall Bias */}
              <td className="px-6 py-4 text-right">
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border",
                  getTrendColor(row.overallBias)
                )}>
                  <TrendIcon trend={row.overallBias} className="h-3 w-3" />
                  {row.overallBias}
                </span>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
