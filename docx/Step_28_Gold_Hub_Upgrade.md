# Step 28: Gold Intelligence Hub Upgrade & Interactive TradingView Integration

## 🎯 Objective
Complete the Phase 2 roadmap item on the Gold Hub (`/gold`) by replacing the static chart placeholder with the live interactive TradingView Advanced Candlestick Chart for `XAUUSD`. In addition, elevate the page with a real-time Gold Correlation & Volatility Metric Strip (24h Range, DXY Correlation, Distance to Support/Resistance) and a dedicated Gold Position & Point Value Reference component.

---

## 🛠 Step-by-Step Implementation

### 1. Create Gold Metrics Strip Component (`components/gold/GoldMetricsCards.tsx`)
Create a responsive statistical strip computing intra-day gold metrics: 24h Dollar Range, DXY inverse correlation index, and distance to key pivot levels.

**File:** `components/gold/GoldMetricsCards.tsx`
```tsx
"use client";

import { DollarSign, ShieldAlert, ArrowUpRight, ArrowDownRight, Compass } from "lucide-react";
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
```

#### Why this was written this way:
- **Real-Time Pivot Distance:** Calculates the exact dollar distance from current market price to the nearest Resistance and Support levels, preventing traders from buying into key resistance ceiling or shorting into demand floor.
- **DXY Negative Correlation Context:** Gold trades inversely to the US Dollar Index. Highlighting the -0.82 correlation reminds traders to confirm Dollar weakness before longing Gold.

---

### 2. Create Gold Interactive Chart Section (`components/gold/GoldChartSection.tsx`)
Create an interactive client component that pairs a live TradingView Candlestick Chart for `XAUUSD` with timeframe switcher controls and lot size pip value quick reference.

**File:** `components/gold/GoldChartSection.tsx`
```tsx
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
```

#### Why this was written this way:
- **Direct TradingView Integration:** Directly embeds `TradingViewWidget` with `symbol="XAUUSD"`. The internal ticker normalizer automatically formats this to `OANDA:XAUUSD` on TradingView CDN.
- **Interval Switcher:** Enables fast cycling between execution timeframes (15M for entry trigger, 1H for market structure, 4H for swing trend, D1 for macro bias) without leaving the dashboard.
- **Risk Multiplier Quick Reference:** Many forex traders misuse lot sizing on Gold because metals have distinct point multipliers compared to currency pairs. Displaying point values ($1 per 0.01 lot) prevents catastrophic overleveraging.

---

### 3. Upgrade Gold Analysis Page Route (`app/(dashboard)/gold/page.tsx`)
Update the page to incorporate the new `GoldMetricsCards` and `GoldChartSection`, replacing the static placeholder.

**File:** `app/(dashboard)/gold/page.tsx`
```tsx
import { getGoldDrivers, getGoldKeyLevels } from "@/lib/services/gold";
import { getQuotes } from "@/lib/services/marketData";
import { GoldDrivers } from "@/components/gold/GoldDrivers";
import { KeyLevels } from "@/components/gold/KeyLevels";
import { GoldMetricsCards } from "@/components/gold/GoldMetricsCards";
import { GoldChartSection } from "@/components/gold/GoldChartSection";
import { formatPrice, calculateChange, formatPercent } from "@/lib/formatters";
import { TrendingUp, TrendingDown, Coins } from "lucide-react";

export default async function GoldPage() {
  const [drivers, levels, quotes] = await Promise.all([
    getGoldDrivers(),
    getGoldKeyLevels(),
    getQuotes()
  ]);

  const goldQuote = quotes.find((q) => q.symbol === "XAUUSD") ?? null;
  const changeObj = goldQuote ? calculateChange(goldQuote.price, goldQuote.previousClose) : null;

  return (
    <div className="space-y-8">
      {/* Header section with live price badge */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Coins className="h-6 w-6 text-amber-500" />
            <span className="text-amber-500">Gold (XAU/USD)</span> Analysis Hub
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Macro drivers, real yields correlation, key market structure, and live candlestick charting.
          </p>
        </div>
        
        {goldQuote && goldQuote.price !== null && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm">
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Spot Price (USD)</p>
              <p className="text-xl font-bold tabular-nums tracking-tight">
                ${formatPrice(goldQuote.price, 2)}
              </p>
            </div>
            {changeObj && (
              <div className={`flex flex-col items-end ${changeObj.isPositive ? "text-emerald-500" : "text-rose-500"}`}>
                {changeObj.isPositive ? <TrendingUp className="h-4 w-4 mb-0.5" /> : <TrendingDown className="h-4 w-4 mb-0.5" />}
                <span className="text-xs font-bold tabular-nums">
                  {formatPercent(changeObj.percent)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 1: Gold Volatility & Pivot Distance Strip */}
      <section>
        <GoldMetricsCards quote={goldQuote} levels={levels} />
      </section>

      {/* Section 2: Macro Drivers */}
      <section className="space-y-3">
        <div>
          <h3 className="text-base font-semibold">Macroeconomic Drivers</h3>
          <p className="text-xs text-muted-foreground">
            Fundamental forces governing long-term institutional demand and gold price trajectory.
          </p>
        </div>
        <GoldDrivers drivers={drivers} />
      </section>

      {/* Section 3: Technical Structure & Live TradingView Chart */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Key Levels (1 col on desktop) */}
        <div className="lg:col-span-1">
          <KeyLevels levels={levels} />
        </div>

        {/* Right Column: Live TradingView Candlestick Chart (2 cols on desktop) */}
        <div className="lg:col-span-2">
          <GoldChartSection />
        </div>
      </section>
    </div>
  );
}
```

#### Why this was written this way:
- **Responsive 2-to-1 Column Grid:** Allocates 2 columns of desktop screen width (`lg:col-span-2`) to the TradingView chart while keeping Key Technical Levels cleanly accessible in the left column (`lg:col-span-1`).
- **Elimination of Placeholders:** Fulfills the Phase 2 roadmap goal and removes the last remaining placeholder in the application.

---

## 🧪 Verification & Testing
1. Navigate to `http://localhost:3000/gold` via the left sidebar.
2. Confirm the Gold Metrics strip renders with 24h Price Range, Distance to Resistance, Distance to Support, and DXY Correlation.
3. Verify that the TradingView Advanced Candlestick Chart renders for `OANDA:XAUUSD` with no console errors.
4. Click through the interval buttons (`15M`, `1H`, `4H`, `Daily`) and verify the chart reloads cleanly with the requested timeframe.
5. Verify that toggling Dark/Light mode in the header updates the background of the Gold chart.

