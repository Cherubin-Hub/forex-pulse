"use client";

import { useState } from "react";
import { TradingViewWidget } from "@/components/charts/TradingViewWidget";
import { Button } from "@/components/ui/button";
import { Coins, Info } from "lucide-react";

type ChartInterval = "15" | "60" | "240" | "D";

const INTERVALS: { label: string; value: ChartInterval }[] = [
  { label: "15M (Trigger)", value: "15" },
  { label: "1H (Structure)", value: "60" },
  { label: "4H (Trend)", value: "240" },
  { label: "Daily (Macro)", value: "D" },
];

export function GoldChartSection() {
  const [interval, setInterval] = useState<ChartInterval>("60");

  return (
    <div className="space-y-4">
      {/* Header and Interval Selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-500" />
            Live XAU/USD Advanced Chart
          </h3>
          <p className="text-xs text-muted-foreground">
            Institutional order flow, fair value gaps, and liquidity sweeps on OANDA:XAUUSD.
          </p>
        </div>

        {/* Timeframe Switcher Buttons */}
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 p-1">
          {INTERVALS.map((tf) => {
            const isSelected = interval === tf.value;
            return (
              <Button
                key={tf.value}
                size="sm"
                variant={isSelected ? "default" : "ghost"}
                className="h-7 px-2.5 text-xs font-semibold"
                onClick={() => setInterval(tf.value)}
              >
                {tf.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Embedded TradingView Chart Widget */}
      <TradingViewWidget symbol="XAUUSD" interval={interval} height={520} />

      {/* Gold Lot Size & Pip Value Reference Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary shrink-0" />
          <span>
            <strong>XAU/USD Risk Rule:</strong> 1 full point ($1.00 move) = <strong>$10.00</strong> per 0.10 lot (or <strong>$1.00</strong> per 0.01 lot).
          </span>
        </div>
        <span className="font-mono text-[11px] opacity-80">
          Broker Feed: OANDA Institutional
        </span>
      </div>
    </div>
  );
}
