"use client";

import { useState } from "react";
import { TradingViewWidget } from "@/components/charts/TradingViewWidget";
import { Button } from "@/components/ui/button";

const WATCHLIST_SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "XAUUSD"];

export function TechnicalChartSection() {
  const [activeSymbol, setActiveSymbol] = useState<string>("EURUSD");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Live Interactive Chart</h3>
          <p className="text-xs text-muted-foreground">
            Execute technical analysis with built-in indicators and candlestick patterns.
          </p>
        </div>

        {/* Quick Symbol Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-muted/40 p-1">
          {WATCHLIST_SYMBOLS.map((symbol) => {
            const isSelected = activeSymbol === symbol;
            return (
              <Button
                key={symbol}
                variant={isSelected ? "default" : "ghost"}
                size="sm"
                className="h-7 px-3 text-xs font-semibold"
                onClick={() => setActiveSymbol(symbol)}
              >
                {symbol}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Embedded Chart */}
      <TradingViewWidget symbol={activeSymbol} height={520} />
    </div>
  );
}
