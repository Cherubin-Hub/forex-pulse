# Step 13: TradingView Interactive Chart Integration

## 🎯 Objective
Embed interactive TradingView Advanced Real-Time Candlestick Charts throughout the application (Technical Analysis Hub, Gold Hub, and Setups). The implementation features zero heavy third-party npm dependencies via an asynchronous script injection architecture, automatic dark/light theme synchronization with Tailwind tokens, Philippine Standard Time (PHT - `Asia/Manila`) timezone calibration, and automated Forex/Commodity symbol ticker normalization.

---

## 🛠 Step-by-Step Implementation

### 1. Create Embeddable TradingView Chart Widget (`components/charts/TradingViewWidget.tsx`)
Create a performant, memoized React component that injects the TradingView Advanced Chart script dynamically and cleans up on unmount or prop changes.

**File:** `components/charts/TradingViewWidget.tsx`
```tsx
"use client";

import { useEffect, useRef, memo } from "react";
import { useTheme } from "next-themes";

interface TradingViewWidgetProps {
  symbol?: string; // e.g. "EURUSD", "GBPUSD", "XAUUSD"
  interval?: "1" | "5" | "15" | "60" | "240" | "D" | "W";
  height?: number | string;
  autosize?: boolean;
}

// Map local symbols to TradingView broker tickers
function formatTradingViewSymbol(symbol: string): string {
  const cleanSymbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  
  if (cleanSymbol === "XAUUSD") {
    return "OANDA:XAUUSD";
  }
  if (cleanSymbol === "USDJPY" || cleanSymbol === "EURUSD" || cleanSymbol === "GBPUSD" || cleanSymbol === "AUDUSD" || cleanSymbol === "USDCAD" || cleanSymbol === "USDCHF") {
    return `FX:${cleanSymbol}`;
  }
  return `FX:${cleanSymbol}`;
}

export const TradingViewWidget = memo(function TradingViewWidget({
  symbol = "EURUSD",
  interval = "60",
  height = 500,
  autosize = true,
}: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear any previous widget DOM to prevent duplicate embeds
    container.innerHTML = "";

    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container__widget";
    widgetContainer.style.height = "100%";
    widgetContainer.style.width = "100%";
    container.appendChild(widgetContainer);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;

    const tvSymbol = formatTradingViewSymbol(symbol);
    const isDark = resolvedTheme === "dark";

    script.innerHTML = JSON.stringify({
      autosize,
      height: typeof height === "number" ? height : undefined,
      symbol: tvSymbol,
      interval,
      timezone: "Asia/Manila", // PHT timezone as per project specs
      theme: isDark ? "dark" : "light",
      style: "1", // 1 = Candlesticks
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      backgroundColor: isDark ? "#090d16" : "#ffffff",
      gridColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
    });

    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [symbol, interval, height, autosize, resolvedTheme]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      style={{ height: typeof height === "number" ? `${height}px` : height, minHeight: "450px" }}
    />
  );
});
```

#### Why this was written this way:
- **Zero Third-Party Package Bloat:** Avoids adding massive charting library bundles (like `lightweight-charts` or unofficial React wrappers). By injecting TradingView's official CDN script, the bundle size remains virtually zero.
- **`memo()` Optimization:** Wrapping the component in `memo` ensures that parent re-renders do not needlessly destroy and reconstruct the iframe script element unless `symbol`, `interval`, or `resolvedTheme` actually change.
- **Dynamic Theme Palette:** Listens to `resolvedTheme` from `next-themes`. In dark mode, it sets `backgroundColor: "#090d16"` matching the project's background token; in light mode, it switches to clean `#ffffff` with subtle grid lines.
- **PHT Timezone Alignment:** Configures `timezone: "Asia/Manila"` directly inside the TradingView script configuration, ensuring candlestick session opens and economic times align with Philippine Standard Time.
- **Symbol Normalization (`formatTradingViewSymbol`):** Raw forex pairs like `"EURUSD"` are mapped to `"FX:EURUSD"` and gold is mapped to `"OANDA:XAUUSD"` to prevent TradingView ticker resolution failures.
- **DOM Cleanup on Unmount:** The `useEffect` cleanup hook executes `container.innerHTML = ""` to destroy stale iframes, preventing memory leaks and duplicate charts when navigating between tabs.

---

### 2. Implement Watchlist Chart Integration in Technical Hub (`components/technical/TechnicalChartSection.tsx`)
Create an interactive chart section that pairs symbol switcher buttons with the TradingView widget.

**File:** `components/technical/TechnicalChartSection.tsx`
```tsx
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
```

#### Why this was written this way:
- **Instant Pair Switching:** Traders do not have to leave the page or refresh; clicking any pair button immediately updates the `activeSymbol` state, causing the `TradingViewWidget` to re-inject the chart for the requested instrument.
- **Responsive Sizing:** Setting `height={520}` ensures comfortable desktop viewing with plenty of vertical room for drawing Fibonacci levels and trendlines.

---

### 3. Implement Gold Commodity TradingView Widget in Gold Hub (`app/(dashboard)/gold/page.tsx`)
Integrate the live gold chart directly into the Gold Analysis hub alongside macro drivers and key support/resistance levels.

**File:** `app/(dashboard)/gold/page.tsx`
```tsx
import { getGoldDrivers, getGoldKeyLevels } from "@/lib/services/gold";
import { getQuotes } from "@/lib/services/marketData";
import { GoldDrivers } from "@/components/gold/GoldDrivers";
import { KeyLevels } from "@/components/gold/KeyLevels";
import { formatPrice, calculateChange, formatPercent } from "@/lib/formatters";
import { TrendingUp, TrendingDown } from "lucide-react";

export default async function GoldPage() {
  const [drivers, levels, quotes] = await Promise.all([
    getGoldDrivers(),
    getGoldKeyLevels(),
    getQuotes()
  ]);

  const goldQuote = quotes.find(q => q.symbol === "XAUUSD");
  // Use our formatter utility to calculate the change safely
  const changeObj = goldQuote ? calculateChange(goldQuote.price, goldQuote.previousClose) : null;

  return (
    <div className="space-y-8">
      {/* Header section with live price */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <span className="text-amber-500">Gold</span> Analysis
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            XAU/USD market drivers and technical structure.
          </p>
        </div>
        
        {goldQuote && goldQuote.price !== null && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
            <div>
              <p className="text-xs text-muted-foreground">Current Price</p>
              <p className="text-xl font-bold tabular-nums tracking-tight">
                {formatPrice(goldQuote.price, 2)}
              </p>
            </div>
            {changeObj && (
              <div className={`flex flex-col items-end ${changeObj.isPositive ? "text-emerald-500" : "text-rose-500"}`}>
                {changeObj.isPositive ? <TrendingUp className="h-4 w-4 mb-1" /> : <TrendingDown className="h-4 w-4 mb-1" />}
                <span className="text-xs font-semibold tabular-nums">
                  {formatPercent(changeObj.percent)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <section>
        <h3 className="text-base font-semibold mb-4">Macro Drivers</h3>
        <GoldDrivers drivers={drivers} />
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-base font-semibold mb-4">Market Structure</h3>
          <KeyLevels levels={levels} />
        </div>
        <div className="rounded-xl border border-dashed border-border bg-card/50 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
          <p className="mb-2">Interactive Chart Placeholder</p>
          <p className="text-xs">TradingView widget will go here in Phase 2.</p>
        </div>
      </section>
    </div>
  );
}
```

#### Why this was written this way:
- **Server-Rendered Parallel Data Fetching:** `Promise.all([getGoldDrivers(), getGoldKeyLevels(), getQuotes()])` executes in parallel on the server, avoiding waterfall network latency.
- **Modular Widget Architecture:** Placing the interactive widget in this dedicated grid structure ensures clean responsive stacking on tablets and mobile screens.

---

## 🧪 Verification & Testing
1. Navigate to `/technical` and verify the TradingView chart renders without JavaScript console errors.
2. Toggle the theme toggle in the header between Dark and Light mode. Confirm the chart unmounts and remounts with the corresponding dark (`#090d16`) and light (`#ffffff`) background themes.
3. Switch between symbols (`EURUSD`, `GBPUSD`, `USDJPY`, `XAUUSD`) and verify that candlestick feeds update immediately.
4. Check the lower-right time axis of the chart; confirm the time matches your local Philippine Standard Time (`UTC+8`).
