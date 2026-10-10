# Step 12: Technical Analysis Hub & Multi-Timeframe Matrix

## 🎯 Objective
Build a multi-timeframe trend alignment dashboard across four critical trading intervals (`D1`, `H4`, `H1`, and `M15`). The dashboard aggregates Exponential Moving Average (EMA 50/200) bias, Relative Strength Index (RSI 14) momentum, and Average True Range (ATR) volatility, pairing them with an interactive chart switcher to ensure traders only execute setups aligned with higher-timeframe market structure.

---

## 🛠 Step-by-Step Implementation

### 1. Create Technical Domain Model Types (`types/technical.ts`)
Create the core TypeScript interfaces governing timeframes, directional bias, and technical indicator payloads.

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
```

#### Why this was written this way:
- **`Record<Timeframe, IndicatorData>` Mapping:** Enforces that every instrument object strictly provides indicator measurements for all four tracked timeframes (`D1`, `H4`, `H1`, `M15`) without missing keys or partial definitions.
- **`TrendDirection` Union:** Normalizes indicator output across indicators (EMA trend, MACD momentum, overall bias) to strict enum-like string literals (`"BULLISH" | "BEARISH" | "NEUTRAL"`), eliminating ad-hoc string comparisons across UI components.
- **Separation of Model:** Pure domain models live strictly in `types/` following project MVC architecture.

---

### 2. Create Mock Technical Indicators Data (`lib/mock/technical.ts`)
Create mock technical state objects representing currency pairs and commodities across varying market conditions (trending, pulling back, and ranging).

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
      M15: { rsi: 60, macd: "BULLISH", emaTrend: "BULLISH", atr: 5 }, // Pullback on lower timeframe
    }
  },
  {
    symbol: "XAUUSD",
    overallBias: "BULLISH",
    timeframes: {
      D1: { rsi: 68, macd: "BULLISH", emaTrend: "BULLISH", atr: 250 },
      H4: { rsi: 72, macd: "BULLISH", emaTrend: "BULLISH", atr: 120 },
      H1: { rsi: 65, macd: "BULLISH", emaTrend: "BULLISH", atr: 50 },
      M15: { rsi: 55, macd: "NEUTRAL", emaTrend: "BULLISH", atr: 20 },
    }
  },
  {
    symbol: "GBPUSD",
    overallBias: "NEUTRAL",
    timeframes: {
      D1: { rsi: 51, macd: "NEUTRAL", emaTrend: "NEUTRAL", atr: 75 },
      H4: { rsi: 48, macd: "BEARISH", emaTrend: "NEUTRAL", atr: 30 },
      H1: { rsi: 40, macd: "BEARISH", emaTrend: "BEARISH", atr: 15 },
      M15: { rsi: 35, macd: "BEARISH", emaTrend: "BEARISH", atr: 8 },
    }
  }
];
```

#### Why this was written this way:
- **Realistic Confluence Simulation:** `EURUSD` demonstrates a textbook higher-timeframe downtrend (`D1`/`H4` bearish) currently experiencing a short-term lower-timeframe pullback (`M15` bullish), allowing traders to spot discount short entries.
- **Isolated Mock Layer:** Mock records match the `TechnicalAnalysis` interface contract exactly, allowing zero-friction transition to external REST or WebSocket market data feeds.

---

### 3. Create Technical Service Controller (`lib/services/technical.ts`)
Create an asynchronous controller function responsible for fetching technical analysis records.

**File:** `lib/services/technical.ts`
```typescript
import type { TechnicalAnalysis } from "@/types/technical";
import { MOCK_TECHNICALS } from "@/lib/mock/technical";

export async function getTechnicalAnalysis(): Promise<TechnicalAnalysis[]> {
  return MOCK_TECHNICALS;
}
```

#### Why this was written this way:
- **Strict MVC Separation:** UI components never import `MOCK_TECHNICALS` directly. They invoke `getTechnicalAnalysis()`, ensuring future data sources (API routes or database models) can be swapped in without modifying any frontend component code.
- **Asynchronous Signature:** Returning `Promise<TechnicalAnalysis[]>` mirrors real network behavior and integrates cleanly with Next.js React Server Components.

---

### 4. Create Multi-Timeframe Matrix Component (`components/technical/MTFMatrix.tsx`)
Create a responsive matrix table that visualizes directional alignment across all timeframes with color-coded badges, Lucide icons, and Framer Motion staggered animations.

**File:** `components/technical/MTFMatrix.tsx`
```tsx
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
```

#### Why this was written this way:
- **Visual Trend Scannability:** Traders make decisions in seconds. Emerald (bullish) and rose (bearish) color styling with `TrendIcon` renders instant visual recognition across all four intervals.
- **Embedded RSI Sub-Indicator:** Beneath the primary EMA bias, each cell includes an `Activity` icon and the exact RSI reading, showing whether an asset is overextended (RSI > 70 or < 30).
- **Responsive Table Wrapping:** Wrapped in `overflow-x-auto` to prevent layout breaking on mobile devices.
- **Framer Motion Entrance:** Staggered row animation provides a polished desktop feel without blocking hydration.

---

### 5. Create Technical Chart Interactive Section (`components/technical/TechnicalChartSection.tsx`)
Create an interactive chart section featuring a quick symbol switcher bar coupled to the TradingView chart widget.

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
- **Client-Side State Isolation:** Encapsulates the `activeSymbol` state within this client component, preventing the parent page (`TechnicalPage`) from needing `"use client"`.
- **Seamless Switcher Bar:** Traders can cycle between watchlist instruments (`EURUSD`, `GBPUSD`, `USDJPY`, `AUDUSD`, `XAUUSD`) with a single click, instantly re-rendering the embedded TradingView widget.

---

### 6. Create Technical Analysis Dashboard Route (`app/(dashboard)/technical/page.tsx`)
Assemble the server-rendered page that fetches technical data and coordinates the MTF matrix and interactive chart components.

**File:** `app/(dashboard)/technical/page.tsx`
```tsx
import { Activity } from "lucide-react";
import { getTechnicalAnalysis } from "@/lib/services/technical";
import { MTFMatrix } from "@/components/technical/MTFMatrix";
import { TechnicalChartSection } from "@/components/technical/TechnicalChartSection";

export default async function TechnicalPage() {
  const data = await getTechnicalAnalysis();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Technical Analysis
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Multi-timeframe trend alignment, momentum indicators, and live charts.
          </p>
        </div>
      </div>

      {/* Section 1: Multi-Timeframe Matrix */}
      <section className="space-y-3">
        <div>
          <h3 className="text-base font-semibold">MTF Trend Matrix</h3>
          <p className="text-xs text-muted-foreground">
            Look for alignment across D1, H4, and H1 for high-probability setups.
          </p>
        </div>
        
        <MTFMatrix data={data} />
      </section>

      {/* Section 2: Interactive TradingView Chart */}
      <section>
        <TechnicalChartSection />
      </section>
    </div>
  );
}
```

#### Why this was written this way:
- **Server Component Architecture:** The root page remains an asynchronous React Server Component. It fetches data directly on the server via `await getTechnicalAnalysis()` and streams the pre-rendered HTML to the client for lightning-fast initial load times.
- **Sectioned Visual Hierarchy:** Clearly delineates high-level statistical alignment (MTF Matrix) from deep granular charting (TradingView widget).

---

## 🧪 Verification & Testing
1. Navigate to `http://localhost:3000/technical`.
2. Verify that EURUSD, XAUUSD, and GBPUSD display inside the MTF Matrix table with corresponding EMA and RSI badges.
3. Click through the symbol buttons (`EURUSD`, `GBPUSD`, `USDJPY`, `AUDUSD`, `XAUUSD`) in the interactive chart section and confirm that the TradingView widget updates cleanly to the selected pair.
4. Verify that dark and light themes render legible background colors and text contrast.
