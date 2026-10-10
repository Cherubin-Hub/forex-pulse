# Step 34: Multi-Timeframe Technical Command Console & Pivot Levels Engine

## 🎯 Objective
Upgrade the Technical Analysis Hub (`/technical`) into an institutional multi-timeframe command console. This step delivers:
1. **Full-Spectrum Instrument Coverage:** Expands multi-timeframe indicator data across all 8 core instruments (`EURUSD`, `GBPUSD`, `USDJPY`, `AUDUSD`, `NZDUSD`, `USDCAD`, `USDCHF`, `XAUUSD`).
2. **Mathematical Confluence Alignment Engine (`lib/technicalUtils.ts`):** Calculates weighted multi-timeframe trend alignment scores (D1, H4, H1, M15) to separate high-probability trend continuation setups from lower-timeframe pullbacks and choppy ranges.
3. **Floor Trader Pivot Points & Volatility Range Calculator:** Computes standard daily pivots ($P, R_1, R_2, S_1, S_2$) and ATR-projected volatility envelopes for the active pair.
4. **Unified Interactive Technical Console (`components/technical/TechnicalConsole.tsx`):** Synchronizes the MTF Trend Matrix table with the live TradingView candlestick widget, indicator gauges (RSI, MACD, ATR, EMA), and daily structural pivot levels.

---

## 🛠 Step-by-Step Implementation

### 1. Expand Technical Types (`types/technical.ts`)
Add type declarations for Daily Pivot Levels and Multi-Timeframe Confluence Scores.

**File:** `types/technical.ts`
```typescript
export type Timeframe = "D1" | "H4" | "H1" | "M15";
export type TrendDirection = "BULLISH" | "BEARISH" | "NEUTRAL";

export type IndicatorData = {
  rsi: number;
  macd: TrendDirection;
  emaTrend: TrendDirection; // Price relative to 50 & 200 EMA
  atr: number; // Average True Range (Volatility)
};

export type TechnicalAnalysis = {
  symbol: string;
  timeframes: Record<Timeframe, IndicatorData>;
  overallBias: TrendDirection;
};

export type PivotLevels = {
  pivot: number;
  r1: number;
  r2: number;
  s1: number;
  s2: number;
  projectedHigh: number;
  projectedLow: number;
};

export type ConfluenceScore = {
  scorePercent: number;
  dominantTrend: TrendDirection;
  alignmentLabel: string;
};
```

#### Why this was written this way:
- **Modular Type Structure:** Keeps mathematical indicator values, multi-timeframe records, and pivot calculations strongly typed without using loose `number[]` or `any`.

---

### 2. Create Technical Calculation Utilities (`lib/technicalUtils.ts`)
Create utilities to calculate weighted confluence alignment scores and Floor Trader Pivot levels.

**File:** `lib/technicalUtils.ts`
```typescript
import type { TechnicalAnalysis, ConfluenceScore, PivotLevels, TrendDirection } from "@/types/technical";
import type { PriceQuote } from "@/types/market";
import { INSTRUMENTS } from "@/lib/constants/instruments";

/**
 * Computes a weighted multi-timeframe trend alignment score (D1: 35%, H4: 30%, H1: 20%, M15: 15%).
 */
export function calculateConfluenceScore(tech: TechnicalAnalysis): ConfluenceScore {
  const weights = {
    D1: 0.35,
    H4: 0.30,
    H1: 0.20,
    M15: 0.15,
  };

  let bullishWeight = 0;
  let bearishWeight = 0;

  for (const [tfKey, weight] of Object.entries(weights)) {
    const tf = tfKey as keyof typeof weights;
    const data = tech.timeframes[tf];
    if (!data) continue;

    // Evaluate EMA trend and MACD alignment
    if (data.emaTrend === "BULLISH") bullishWeight += weight * 0.6;
    else if (data.emaTrend === "BEARISH") bearishWeight += weight * 0.6;

    if (data.macd === "BULLISH") bullishWeight += weight * 0.4;
    else if (data.macd === "BEARISH") bearishWeight += weight * 0.4;
  }

  let dominantTrend: TrendDirection = "NEUTRAL";
  let scorePercent = 50;
  let alignmentLabel = "Mixed / Consolidation";

  if (bullishWeight > bearishWeight && bullishWeight >= 0.55) {
    dominantTrend = "BULLISH";
    scorePercent = Math.round(bullishWeight * 100);
    alignmentLabel = scorePercent >= 80 ? "Strong Bullish Alignment" : "Bullish Trend (Pullback Active)";
  } else if (bearishWeight > bullishWeight && bearishWeight >= 0.55) {
    dominantTrend = "BEARISH";
    scorePercent = Math.round(bearishWeight * 100);
    alignmentLabel = scorePercent >= 80 ? "Strong Bearish Alignment" : "Bearish Trend (Pullback Active)";
  }

  return {
    scorePercent,
    dominantTrend,
    alignmentLabel,
  };
}

/**
 * Calculates standard Floor Trader Pivot levels and ATR-based volatility envelope.
 */
export function calculateDailyPivots(quote: PriceQuote, atrPips: number): PivotLevels {
  const symbol = quote.symbol;
  const isGold = symbol === "XAUUSD";
  const isJpy = symbol.includes("JPY");
  const pipMultiplier = isGold ? 0.1 : isJpy ? 0.01 : 0.0001;

  // Hydration-safe fallback handling for nullable quote metrics
  const close = quote.price ?? quote.previousClose ?? (isGold ? 2650 : isJpy ? 150 : 1.1);
  const high = quote.high ?? (close > 0 ? close * 1.004 : 1.0);
  const low = quote.low ?? (close > 0 ? close * 0.996 : 1.0);

  // Standard Floor Trader Pivots
  const pivot = (high + low + close) / 3;
  const r1 = 2 * pivot - low;
  const s1 = 2 * pivot - high;
  const r2 = pivot + (high - low);
  const s2 = pivot - (high - low);

  // Daily Expected ATR Volatility Range
  const atrDistance = atrPips * pipMultiplier;
  const projectedHigh = close + atrDistance;
  const projectedLow = close - atrDistance;

  const decimals = INSTRUMENTS.find((i) => i.symbol === symbol)?.decimals ?? 5;

  return {
    pivot: Number(pivot.toFixed(decimals)),
    r1: Number(r1.toFixed(decimals)),
    r2: Number(r2.toFixed(decimals)),
    s1: Number(s1.toFixed(decimals)),
    s2: Number(s2.toFixed(decimals)),
    projectedHigh: Number(projectedHigh.toFixed(decimals)),
    projectedLow: Number(projectedLow.toFixed(decimals)),
  };
}
```

#### Why this was written this way:
- **Hierarchical Timeframe Weighting:** High-timeframe macro structure (D1 and H4) carries 65% of the total confluence weight, ensuring lower-timeframe noise on M15 doesn't trick the trader into fighting the dominant trend.
- **Instrument-Specific Decimals:** Formats pivot and ATR boundary outputs using each instrument's actual price precision (e.g., 2 decimals for Gold, 3 for JPY, 5 for majors).

---

### 3. Expand Mock Technicals Coverage (`lib/mock/technical.ts`)
Add all 8 core instruments to the technical analysis dataset.

**File:** `lib/mock/technical.ts`
```typescript
import type { TechnicalAnalysis } from "@/types/technical";

export const MOCK_TECHNICALS: TechnicalAnalysis[] = [
  {
    symbol: "EURUSD",
    overallBias: "BEARISH",
    timeframes: {
      D1: { rsi: 42, macd: "BEARISH", emaTrend: "BEARISH", atr: 65 },
      H4: { rsi: 38, macd: "BEARISH", emaTrend: "BEARISH", atr: 25 },
      H1: { rsi: 45, macd: "NEUTRAL", emaTrend: "BEARISH", atr: 12 },
      M15: { rsi: 60, macd: "BULLISH", emaTrend: "BULLISH", atr: 5 },
    },
  },
  {
    symbol: "GBPUSD",
    overallBias: "NEUTRAL",
    timeframes: {
      D1: { rsi: 51, macd: "NEUTRAL", emaTrend: "NEUTRAL", atr: 75 },
      H4: { rsi: 48, macd: "BEARISH", emaTrend: "NEUTRAL", atr: 30 },
      H1: { rsi: 40, macd: "BEARISH", emaTrend: "BEARISH", atr: 15 },
      M15: { rsi: 35, macd: "BEARISH", emaTrend: "BEARISH", atr: 8 },
    },
  },
  {
    symbol: "USDJPY",
    overallBias: "BULLISH",
    timeframes: {
      D1: { rsi: 64, macd: "BULLISH", emaTrend: "BULLISH", atr: 110 },
      H4: { rsi: 58, macd: "BULLISH", emaTrend: "BULLISH", atr: 45 },
      H1: { rsi: 52, macd: "NEUTRAL", emaTrend: "BULLISH", atr: 22 },
      M15: { rsi: 48, macd: "BEARISH", emaTrend: "NEUTRAL", atr: 10 },
    },
  },
  {
    symbol: "AUDUSD",
    overallBias: "BEARISH",
    timeframes: {
      D1: { rsi: 39, macd: "BEARISH", emaTrend: "BEARISH", atr: 55 },
      H4: { rsi: 42, macd: "BEARISH", emaTrend: "BEARISH", atr: 20 },
      H1: { rsi: 46, macd: "NEUTRAL", emaTrend: "BEARISH", atr: 11 },
      M15: { rsi: 52, macd: "BULLISH", emaTrend: "NEUTRAL", atr: 6 },
    },
  },
  {
    symbol: "NZDUSD",
    overallBias: "NEUTRAL",
    timeframes: {
      D1: { rsi: 48, macd: "NEUTRAL", emaTrend: "NEUTRAL", atr: 50 },
      H4: { rsi: 45, macd: "BEARISH", emaTrend: "NEUTRAL", atr: 18 },
      H1: { rsi: 49, macd: "NEUTRAL", emaTrend: "NEUTRAL", atr: 9 },
      M15: { rsi: 51, macd: "BULLISH", emaTrend: "BULLISH", atr: 5 },
    },
  },
  {
    symbol: "USDCAD",
    overallBias: "BULLISH",
    timeframes: {
      D1: { rsi: 62, macd: "BULLISH", emaTrend: "BULLISH", atr: 60 },
      H4: { rsi: 59, macd: "BULLISH", emaTrend: "BULLISH", atr: 24 },
      H1: { rsi: 55, macd: "BULLISH", emaTrend: "BULLISH", atr: 13 },
      M15: { rsi: 50, macd: "NEUTRAL", emaTrend: "BULLISH", atr: 6 },
    },
  },
  {
    symbol: "USDCHF",
    overallBias: "BEARISH",
    timeframes: {
      D1: { rsi: 41, macd: "BEARISH", emaTrend: "BEARISH", atr: 52 },
      H4: { rsi: 44, macd: "BEARISH", emaTrend: "BEARISH", atr: 19 },
      H1: { rsi: 47, macd: "NEUTRAL", emaTrend: "BEARISH", atr: 10 },
      M15: { rsi: 54, macd: "BULLISH", emaTrend: "NEUTRAL", atr: 5 },
    },
  },
  {
    symbol: "XAUUSD",
    overallBias: "BULLISH",
    timeframes: {
      D1: { rsi: 68, macd: "BULLISH", emaTrend: "BULLISH", atr: 250 },
      H4: { rsi: 72, macd: "BULLISH", emaTrend: "BULLISH", atr: 120 },
      H1: { rsi: 65, macd: "BULLISH", emaTrend: "BULLISH", atr: 50 },
      M15: { rsi: 55, macd: "NEUTRAL", emaTrend: "BULLISH", atr: 20 },
    },
  },
];
```

---

### 4. Create Daily Pivot Levels Card (`components/technical/PivotLevelsCard.tsx`)
Create a visual card rendering the Daily Pivot Points ($S_2, S_1, P, R_1, R_2$) and ATR Volatility Boundaries.

**File:** `components/technical/PivotLevelsCard.tsx`
```tsx
"use client";

import { Target, Layers } from "lucide-react";
import type { PivotLevels } from "@/types/technical";

interface PivotLevelsCardProps {
  symbol: string;
  pivots: PivotLevels;
}

export function PivotLevelsCard({ symbol, pivots }: PivotLevelsCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-xs uppercase tracking-wider">
            Daily Pivot Levels ({symbol})
          </h4>
        </div>
        <span className="text-[10px] text-muted-foreground uppercase font-semibold">
          Floor Trader Standard
        </span>
      </div>

      {/* Grid of Pivot Levels */}
      <div className="grid grid-cols-5 gap-2 text-center text-xs">
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-2">
          <p className="text-[10px] text-muted-foreground font-semibold">S2</p>
          <p className="font-mono font-bold text-rose-500 mt-0.5">{pivots.s2}</p>
        </div>
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-2">
          <p className="text-[10px] text-muted-foreground font-semibold">S1</p>
          <p className="font-mono font-bold text-rose-400 mt-0.5">{pivots.s1}</p>
        </div>
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-2">
          <p className="text-[10px] text-primary font-semibold">PIVOT (P)</p>
          <p className="font-mono font-bold text-foreground mt-0.5">{pivots.pivot}</p>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2">
          <p className="text-[10px] text-muted-foreground font-semibold">R1</p>
          <p className="font-mono font-bold text-emerald-400 mt-0.5">{pivots.r1}</p>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2">
          <p className="text-[10px] text-muted-foreground font-semibold">R2</p>
          <p className="font-mono font-bold text-emerald-500 mt-0.5">{pivots.r2}</p>
        </div>
      </div>

      {/* Daily Volatility Boundaries */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Layers className="h-3.5 w-3.5" />
          <span>Expected Daily Volatility Range:</span>
        </div>
        <div className="font-mono text-[11px] font-semibold space-x-2">
          <span className="text-rose-500">Low: {pivots.projectedLow}</span>
          <span className="text-muted-foreground">—</span>
          <span className="text-emerald-500">High: {pivots.projectedHigh}</span>
        </div>
      </div>
    </div>
  );
}
```

---

### 5. Create Unified Technical Console (`components/technical/TechnicalConsole.tsx`)
Create the interactive client console that coordinates row selection, confluence scoring, indicator gauges, pivot points, and the live TradingView candlestick widget.

**File:** `components/technical/TechnicalConsole.tsx`
```tsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, Activity, PlusCircle } from "lucide-react";
import type { TechnicalAnalysis, Timeframe, TrendDirection } from "@/types/technical";
import type { PriceQuote } from "@/types/market";
import { calculateConfluenceScore, calculateDailyPivots } from "@/lib/technicalUtils";
import { PivotLevelsCard } from "@/components/technical/PivotLevelsCard";
import { TradingViewWidget } from "@/components/charts/TradingViewWidget";
import { Button, buttonVariants } from "@/components/ui/button";
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
```

---

### 6. Upgrade Technical Analysis Page (`app/(dashboard)/technical/page.tsx`)
Connect the server data fetching for both technical indicator matrices and price quotes to feed into the `TechnicalConsole`.

**File:** `app/(dashboard)/technical/page.tsx`
```tsx
import { Activity } from "lucide-react";
import { getTechnicalAnalysis } from "@/lib/services/technical";
import { getQuotes } from "@/lib/services/marketData";
import { TechnicalConsole } from "@/components/technical/TechnicalConsole";

export default async function TechnicalPage() {
  const [technicals, quotes] = await Promise.all([
    getTechnicalAnalysis(),
    getQuotes(),
  ]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Technical Analysis Command Hub
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Multi-timeframe trend alignment, daily pivot levels, and interactive TradingView charting.
          </p>
        </div>
      </div>

      <TechnicalConsole technicals={technicals} quotes={quotes} />
    </div>
  );
}
```

---

## 🧪 Verification & Testing
1. Navigate to `http://localhost:3000/technical` via the sidebar.
2. Confirm the **MTF Trend Matrix** displays all 8 core instruments (`EURUSD`, `GBPUSD`, `USDJPY`, `AUDUSD`, `NZDUSD`, `USDCAD`, `USDCHF`, `XAUUSD`).
3. Click any row (e.g. `USDJPY` or `XAUUSD`) and verify:
   - The row is highlighted with the primary indicator dot.
   - The **Active Analysis Focus** banner updates its Confluence Score and label.
   - The **Daily Pivot Levels** card recalculates $S_2, S_1, P, R_1, R_2$ and volatility bounds.
   - The **TradingView Chart** automatically switches to the selected pair.
4. Verify the **Create Setup for [Symbol]** button routes cleanly to `/setups`.

