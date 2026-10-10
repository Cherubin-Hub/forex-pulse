"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus, LineChart, Search } from "lucide-react";
import type { PriceQuote, InstrumentCategory } from "@/types/market";
import { INSTRUMENTS } from "@/lib/constants/instruments";
import {
  formatPrice,
  calculateChange,
  formatPercent,
  calculatePipChange,
  calculateDailyRangePips,
} from "@/lib/formatters";
import { Sparkline } from "@/components/market/Sparkline";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface MarketsTableProps {
  quotes: PriceQuote[];
}

type FilterCategory = "ALL" | InstrumentCategory;

export function MarketsTable({ quotes }: MarketsTableProps) {
  const [activeCategory, setActiveCategory] = useState<FilterCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const enrichedData = useMemo(() => {
    return quotes.map((q) => {
      const instrument = INSTRUMENTS.find((i) => i.symbol === q.symbol);
      const decimals = instrument?.decimals ?? 5;
      const change = calculateChange(q.price, q.previousClose);
      const pipChange = calculatePipChange(q.price, q.previousClose, decimals);
      const rangePips = calculateDailyRangePips(q.high, q.low, decimals);

      // Percentage position within 24h range (Low = 0%, High = 100%)
      let rangeProgress = 50;
      if (q.high !== null && q.low !== null && q.price !== null && q.high > q.low) {
        rangeProgress = Math.min(100, Math.max(0, ((q.price - q.low) / (q.high - q.low)) * 100));
      }

      return {
        ...q,
        instrument,
        decimals,
        change,
        pipChange,
        rangePips,
        rangeProgress,
      };
    });
  }, [quotes]);

  const filteredData = useMemo(() => {
    return enrichedData.filter((item) => {
      const matchesCategory =
        activeCategory === "ALL" || item.instrument?.category === activeCategory;
      const matchesSearch =
        item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.instrument?.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      return matchesCategory && matchesSearch;
    });
  }, [enrichedData, activeCategory, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Table Controls Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 p-1">
          <Button
            size="sm"
            variant={activeCategory === "ALL" ? "default" : "ghost"}
            className="h-7 px-3 text-xs font-semibold"
            onClick={() => setActiveCategory("ALL")}
          >
            All Assets ({quotes.length})
          </Button>
          <Button
            size="sm"
            variant={activeCategory === "MAJOR" ? "default" : "ghost"}
            className="h-7 px-3 text-xs font-semibold"
            onClick={() => setActiveCategory("MAJOR")}
          >
            Forex Majors
          </Button>
          <Button
            size="sm"
            variant={activeCategory === "COMMODITY" ? "default" : "ghost"}
            className="h-7 px-3 text-xs font-semibold"
            onClick={() => setActiveCategory("COMMODITY")}
          >
            Commodities
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search instrument..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Table Body */}
      <div className="w-full overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-muted/50 text-muted-foreground border-b border-border">
            <tr>
              <th className="px-5 py-3.5 font-medium">Instrument</th>
              <th className="px-5 py-3.5 font-medium text-right">Last Price</th>
              <th className="px-5 py-3.5 font-medium text-right">24h Change</th>
              <th className="px-5 py-3.5 font-medium text-center">24h Range (Low — High)</th>
              <th className="px-5 py-3.5 font-medium text-center">Bias</th>
              <th className="px-5 py-3.5 font-medium text-center">7D Trend</th>
              <th className="px-5 py-3.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredData.map((row) => {
              const isPositive = row.change?.isPositive ?? true;
              return (
                <tr key={row.symbol} className="hover:bg-muted/20 transition-colors">
                  {/* Symbol */}
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col">
                      <span className="font-bold tracking-tight text-foreground">
                        {row.instrument?.displayName ?? row.symbol}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {row.instrument?.category === "MAJOR" ? "Forex Major" : "Precious Metal"}
                      </span>
                    </div>
                  </td>

                  {/* Price */}
                  <td className="px-5 py-3.5 text-right font-semibold tabular-nums">
                    {formatPrice(row.price, row.decimals)}
                  </td>

                  {/* 24h Change (% and Pips) */}
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex flex-col items-end">
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 text-xs font-bold tabular-nums",
                          isPositive ? "text-emerald-500" : "text-rose-500"
                        )}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5" />
                        )}
                        {row.change ? formatPercent(row.change.percent) : "0.00%"}
                      </span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {row.pipChange > 0 ? `+${row.pipChange}` : row.pipChange} pips
                      </span>
                    </div>
                  </td>

                  {/* 24h Range with Visual Progress Bar */}
                  <td className="px-5 py-3.5 text-center min-w-[200px]">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[11px] tabular-nums text-muted-foreground">
                        <span>{formatPrice(row.low, row.decimals)}</span>
                        <span className="font-medium text-foreground">{row.rangePips} pips range</span>
                        <span>{formatPrice(row.high, row.decimals)}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            isPositive ? "bg-emerald-500" : "bg-rose-500"
                          )}
                          style={{ width: `${row.rangeProgress}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Bias */}
                  <td className="px-5 py-3.5 text-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border",
                        row.bias === "BULLISH" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                        row.bias === "BEARISH" && "bg-rose-500/10 text-rose-500 border-rose-500/20",
                        row.bias === "NEUTRAL" && "bg-slate-500/10 text-slate-500 border-slate-500/20"
                      )}
                    >
                      {row.bias === "BULLISH" && <ArrowUpRight className="h-3 w-3" />}
                      {row.bias === "BEARISH" && <ArrowDownRight className="h-3 w-3" />}
                      {row.bias === "NEUTRAL" && <Minus className="h-3 w-3" />}
                      {row.bias}
                    </span>
                  </td>

                  {/* Sparkline */}
                  <td className="px-5 py-3.5 text-center w-[120px]">
                    <div className="w-24 mx-auto">
                      <Sparkline
                        data={row.sparkline}
                        isPositive={isPositive}
                        className="h-7 w-24"
                      />
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href="/technical"
                      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 px-2 text-xs")}
                      title="Inspect Chart on Technical Hub"
                    >
                      <LineChart className="h-3.5 w-3.5 mr-1" />
                      Analyze
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
