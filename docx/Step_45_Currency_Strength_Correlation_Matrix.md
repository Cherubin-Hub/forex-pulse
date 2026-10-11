# Step 45: Institutional Currency Strength Meter & Cross-Asset Correlation Heatmap

## 🎯 Objective
Empower traders with macro-level market awareness and risk-overload prevention on `/markets` by deploying an institutional **Currency Strength Meter & Cross-Asset Correlation Heatmap**. In institutional foreign exchange, currency pairs do not move in isolation—individual currencies (USD, EUR, GBP, JPY, AUD, CAD, CHF, NZD) expand and contract in relative strength, while cross-pair correlations dictate whether multi-asset positions represent true diversification or dangerous leverage duplication. This step delivers:
1. **Correlation & Currency Strength Mathematical Engine (`lib/correlationUtils.ts`):** Computes normalized relative strength indices across all 8 major global currencies and calculates live Pearson correlation coefficients (-1.00 to +1.00) across all tracked currency pairs and Gold using intraday sparkline price series.
2. **Interactive Currency Strength Meter (`components/market/CurrencyStrengthMeter.tsx`):** Visual leaderboard ranking currencies from Strongest to Weakest with color-coded velocity bars and an automated **Macro Divergence Opportunity Alert** (pairing the strongest currency against the weakest).
3. **Interactive Cross-Asset Correlation Heatmap (`components/market/CorrelationHeatmap.tsx`):** An 8x8 matrix color-coded from deep green (positive correlation) to deep red (inverse correlation) with institutional risk advice badges alerting traders to correlated overexposure.
4. **Markets Watchlist Page Integration (`app/(dashboard)/markets/page.tsx`):** Embeds the currency strength and correlation tools directly into the `/markets` hub.

---

## 🛠 Step-by-Step Implementation

### 1. Create Correlation & Currency Strength Engine (`lib/correlationUtils.ts`)
Defines the Pearson correlation math, currency strength index formulas, and risk threshold classifications.

**File:** `lib/correlationUtils.ts`
```typescript
import type { PriceQuote } from "@/types/market";
import { INSTRUMENTS } from "@/lib/constants/instruments";
import { calculateChange } from "@/lib/formatters";

export type CurrencyStrength = {
  currency: string;
  score: number; // Raw relative momentum score
  normalizedScore: number; // -10.0 to +10.0
  barPercentage: number; // 0% to 100% for UI rendering
  bias: "STRONG" | "BULLISH" | "NEUTRAL" | "BEARISH" | "WEAK";
};

export type MacroDivergence = {
  strongest: CurrencyStrength;
  weakest: CurrencyStrength;
  divergenceSpread: number;
  recommendedPair: string;
  rationale: string;
};

export type CorrelationCell = {
  symbolA: string;
  symbolB: string;
  coefficient: number; // -1.00 to +1.00
  intensity: "STRONG_POS" | "MODERATE_POS" | "NEUTRAL" | "MODERATE_NEG" | "STRONG_NEG";
  riskAdvice: string;
};

const MAJOR_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF"] as const;

/**
 * Calculates Pearson correlation coefficient between two series of numbers.
 */
export function calculatePearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (denominator === 0) return 0;

  return Number((numerator / denominator).toFixed(2));
}

/**
 * Computes Relative Currency Strength across the 8 major currencies based on intraday performance.
 */
export function calculateCurrencyStrengths(quotes: PriceQuote[]): {
  strengths: CurrencyStrength[];
  divergence: MacroDivergence | null;
} {
  const currencyScores: Record<string, number> = {};
  for (const c of MAJOR_CURRENCIES) currencyScores[c] = 0;

  for (const q of quotes) {
    if (q.symbol === "XAUUSD") continue; // Exclude commodity gold from currency baskets
    const inst = INSTRUMENTS.find((i) => i.symbol === q.symbol);
    if (!inst) continue;

    const change = calculateChange(q.price, q.previousClose)?.percent ?? 0;
    // Base currency gains positive change; Quote currency gains inverse
    currencyScores[inst.base] = (currencyScores[inst.base] ?? 0) + change;
    currencyScores[inst.quote] = (currencyScores[inst.quote] ?? 0) - change;
  }

  // Find max absolute value to normalize scores on a -10 to +10 scale
  const scores = Object.values(currencyScores);
  const maxAbs = Math.max(0.1, ...scores.map(Math.abs));

  const strengths: CurrencyStrength[] = Object.entries(currencyScores).map(([currency, score]) => {
    const normalizedScore = Number(((score / maxAbs) * 10).toFixed(1));
    const barPercentage = Math.round(((normalizedScore + 10) / 20) * 100);

    let bias: CurrencyStrength["bias"] = "NEUTRAL";
    if (normalizedScore >= 6.0) bias = "STRONG";
    else if (normalizedScore >= 2.0) bias = "BULLISH";
    else if (normalizedScore <= -6.0) bias = "WEAK";
    else if (normalizedScore <= -2.0) bias = "BEARISH";

    return {
      currency,
      score: Number(score.toFixed(2)),
      normalizedScore,
      barPercentage,
      bias,
    };
  });

  strengths.sort((a, b) => b.normalizedScore - a.normalizedScore);

  // Identify Top Macro Divergence
  let divergence: MacroDivergence | null = null;
  if (strengths.length >= 2) {
    const strongest = strengths[0];
    const weakest = strengths[strengths.length - 1];
    const spread = Number((strongest.normalizedScore - weakest.normalizedScore).toFixed(1));

    // Try finding matching tradeable pair
    let recommendedPair = `${strongest.currency}${weakest.currency}`;
    const exists = INSTRUMENTS.some((i) => i.symbol === recommendedPair);
    if (!exists) {
      recommendedPair = `${weakest.currency}${strongest.currency}`;
    }

    divergence = {
      strongest,
      weakest,
      divergenceSpread: spread,
      recommendedPair,
      rationale: `Strongest currency ${strongest.currency} (+${strongest.normalizedScore}) vs Weakest ${weakest.currency} (${weakest.normalizedScore}) creates maximum directional edge on ${recommendedPair}.`,
    };
  }

  return { strengths, divergence };
}

/**
 * Builds the complete pairwise correlation matrix between tracked instruments.
 */
export function buildCorrelationMatrix(quotes: PriceQuote[]): {
  symbols: string[];
  matrix: CorrelationCell[][];
} {
  const filtered = quotes.filter((q) => q.sparkline && q.sparkline.length >= 5);
  const symbols = filtered.map((q) => q.symbol);

  const matrix: CorrelationCell[][] = [];

  for (let i = 0; i < filtered.length; i++) {
    const row: CorrelationCell[] = [];
    const quoteA = filtered[i];

    for (let j = 0; j < filtered.length; j++) {
      const quoteB = filtered[j];

      let coefficient = 1.0;
      if (i !== j) {
        coefficient = calculatePearsonCorrelation(quoteA.sparkline, quoteB.sparkline);
      }

      let intensity: CorrelationCell["intensity"] = "NEUTRAL";
      let riskAdvice = "Independent price action. Low correlation risk.";

      if (coefficient >= 0.7) {
        intensity = "STRONG_POS";
        riskAdvice = "Strong positive correlation! Avoid simultaneous same-direction trades.";
      } else if (coefficient >= 0.3) {
        intensity = "MODERATE_POS";
        riskAdvice = "Moderate positive correlation. Partial exposure overlap.";
      } else if (coefficient <= -0.7) {
        intensity = "STRONG_NEG";
        riskAdvice = "Strong inverse correlation! Positions in opposite directions duplicate risk.";
      } else if (coefficient <= -0.3) {
        intensity = "MODERATE_NEG";
        riskAdvice = "Moderate inverse correlation.";
      }

      row.push({
        symbolA: quoteA.symbol,
        symbolB: quoteB.symbol,
        coefficient,
        intensity,
        riskAdvice,
      });
    }

    matrix.push(row);
  }

  return { symbols, matrix };
}
```

#### Why this was written this way:
- **Intraday Relative Value Basket:** Measures true individual currency strength across peer crosses rather than relying on USD alone.
- **Dynamic Pearson Math:** Calculates real statistical correlations using the 24-point intraday sparkline price series instead of static numbers.

---

### 2. Create Interactive Currency Strength Meter (`components/market/CurrencyStrengthMeter.tsx`)
Create the visual strength leaderboard and automated macro divergence trade setup identifier.

**File:** `components/market/CurrencyStrengthMeter.tsx`
```tsx
"use client";

import { useMemo } from "react";
import { Zap, TrendingUp, TrendingDown, Layers } from "lucide-react";
import type { PriceQuote } from "@/types/market";
import { calculateCurrencyStrengths, type CurrencyStrength } from "@/lib/correlationUtils";
import { cn } from "@/lib/utils";

interface CurrencyStrengthMeterProps {
  quotes: PriceQuote[];
}

export function CurrencyStrengthMeter({ quotes }: CurrencyStrengthMeterProps) {
  const { strengths, divergence } = useMemo(() => {
    return calculateCurrencyStrengths(quotes);
  }, [quotes]);

  const getStrengthColor = (bias: CurrencyStrength["bias"]) => {
    switch (bias) {
      case "STRONG":
        return "bg-emerald-500 text-white";
      case "BULLISH":
        return "bg-emerald-500/70 text-white";
      case "NEUTRAL":
        return "bg-muted-foreground/60 text-white";
      case "BEARISH":
        return "bg-rose-500/70 text-white";
      case "WEAK":
        return "bg-rose-500 text-white";
    }
  };

  const getBadgeColor = (bias: CurrencyStrength["bias"]) => {
    switch (bias) {
      case "STRONG":
        return "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
      case "BULLISH":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "NEUTRAL":
        return "bg-muted text-muted-foreground border-border";
      case "BEARISH":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "WEAK":
        return "bg-rose-500/15 text-rose-500 border-rose-500/30";
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Relative Currency Strength Meter (CSI)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Normalized 8-currency relative momentum basket from intraday price changes.
          </p>
        </div>

        {divergence && (
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-primary font-semibold">
            <Zap className="h-3.5 w-3.5 fill-primary" />
            <span>Top Divergence: {divergence.recommendedPair}</span>
          </div>
        )}
      </div>

      {/* Divergence Opportunity Callout */}
      {divergence && (
        <div className="rounded-lg border border-border/80 bg-muted/20 p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary font-bold font-mono text-[11px]">
              FX
            </span>
            <div>
              <p className="font-semibold text-foreground">
                Macro Momentum Edge: {divergence.strongest.currency} vs {divergence.weakest.currency}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {divergence.rationale}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono shrink-0">
            <span className="text-muted-foreground">Spread Delta:</span>
            <span className="font-bold text-foreground">+{divergence.divergenceSpread} pts</span>
          </div>
        </div>
      )}

      {/* Currency Strength Grid */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 pt-1">
        {strengths.map((s, index) => (
          <div
            key={s.currency}
            className="flex flex-col justify-between rounded-lg border border-border/60 bg-muted/30 p-2.5 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs text-muted-foreground">#{index + 1}</span>
                <span className="font-bold text-sm font-mono">{s.currency}</span>
              </div>
              <span
                className={cn(
                  "rounded border px-1.5 py-0.5 text-[10px] font-bold font-mono uppercase",
                  getBadgeColor(s.bias)
                )}
              >
                {s.bias}
              </span>
            </div>

            {/* Strength Bar */}
            <div className="space-y-1">
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted border border-border/40">
                <div
                  className={cn("h-full transition-all duration-300", getStrengthColor(s.bias))}
                  style={{ width: `${s.barPercentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                <span>Score: {s.normalizedScore > 0 ? `+${s.normalizedScore}` : s.normalizedScore}</span>
                <span>{s.score > 0 ? `+${s.score}%` : `${s.score}%`}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### 3. Create Interactive Cross-Asset Correlation Heatmap (`components/market/CorrelationHeatmap.tsx`)
Create the 8x8 pairwise correlation matrix with interactive color coding and overexposure warnings.

**File:** `components/market/CorrelationHeatmap.tsx`
```tsx
"use client";

import { useState, useMemo } from "react";
import { Grid, AlertTriangle, Info } from "lucide-react";
import type { PriceQuote } from "@/types/market";
import { buildCorrelationMatrix, type CorrelationCell } from "@/lib/correlationUtils";
import { cn } from "@/lib/utils";

interface CorrelationHeatmapProps {
  quotes: PriceQuote[];
}

export function CorrelationHeatmap({ quotes }: CorrelationHeatmapProps) {
  const [selectedCell, setSelectedCell] = useState<CorrelationCell | null>(null);

  const { symbols, matrix } = useMemo(() => {
    return buildCorrelationMatrix(quotes);
  }, [quotes]);

  const getCellBg = (coeff: number) => {
    if (coeff >= 0.7) return "bg-emerald-500/30 text-emerald-500 font-bold";
    if (coeff >= 0.3) return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
    if (coeff > -0.3) return "bg-muted/40 text-muted-foreground";
    if (coeff > -0.7) return "bg-rose-500/15 text-rose-600 dark:text-rose-400";
    return "bg-rose-500/30 text-rose-500 font-bold";
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Grid className="h-4 w-4 text-primary" />
            Cross-Asset Correlation Matrix
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Statistical Pearson correlation (-1.00 to +1.00) across intraday price series.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-emerald-500/30 border border-emerald-500/50" />
            +0.7+ Pos
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-muted border border-border" />
            0.0 Neutral
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-rose-500/30 border border-rose-500/50" />
            -0.7- Inv
          </span>
        </div>
      </div>

      {/* Selected Cell Advice Callout */}
      {selectedCell && (
        <div className="rounded-lg border border-border/80 bg-muted/30 p-3 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="font-semibold text-foreground">
                {selectedCell.symbolA} vs {selectedCell.symbolB} (r = {selectedCell.coefficient > 0 ? `+${selectedCell.coefficient}` : selectedCell.coefficient})
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {selectedCell.riskAdvice}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedCell(null)}
            className="text-[10px] text-muted-foreground hover:text-foreground underline shrink-0"
          >
            Clear
          </button>
        </div>
      )}

      {/* Correlation Table Grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-center text-xs font-mono">
          <thead>
            <tr>
              <th className="p-2 text-left font-semibold text-muted-foreground text-[11px]">
                Asset
              </th>
              {symbols.map((sym) => (
                <th key={sym} className="p-2 font-bold text-foreground text-[11px]">
                  {sym}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={symbols[i]} className="border-t border-border/40">
                <td className="p-2 text-left font-bold text-foreground text-[11px]">
                  {symbols[i]}
                </td>
                {row.map((cell) => {
                  const isSelected =
                    selectedCell?.symbolA === cell.symbolA && selectedCell?.symbolB === cell.symbolB;

                  return (
                    <td
                      key={`${cell.symbolA}-${cell.symbolB}`}
                      onClick={() => setSelectedCell(cell)}
                      className={cn(
                        "p-2 transition-all cursor-pointer select-none",
                        getCellBg(cell.coefficient),
                        isSelected && "ring-2 ring-primary ring-inset z-10"
                      )}
                      title={`${cell.symbolA} vs ${cell.symbolB}: ${cell.coefficient}`}
                    >
                      {cell.coefficient > 0 ? `+${cell.coefficient.toFixed(2)}` : cell.coefficient.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

### 4. Upgrade Markets Page (`app/(dashboard)/markets/page.tsx`)
Embed both `CurrencyStrengthMeter` and `CorrelationHeatmap` seamlessly on the `/markets` page.

**File:** `app/(dashboard)/markets/page.tsx`
```tsx
import { CandlestickChart } from "lucide-react";
import { getQuotes } from "@/lib/services/marketData";
import { MarketsSummaryCards } from "@/components/market/MarketsSummaryCards";
import { MarketsTable } from "@/components/market/MarketsTable";
import { CurrencyStrengthMeter } from "@/components/market/CurrencyStrengthMeter";
import { CorrelationHeatmap } from "@/components/market/CorrelationHeatmap";

export default async function MarketsPage() {
  const quotes = await getQuotes();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CandlestickChart className="h-6 w-6 text-primary" />
            Markets Watchlist
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time price quotes, currency strength rankings, and cross-asset correlation intelligence.
          </p>
        </div>
      </div>

      {/* Top Statistical Cards */}
      <section>
        <MarketsSummaryCards quotes={quotes} />
      </section>

      {/* Relative Currency Strength Leaderboard */}
      <section>
        <CurrencyStrengthMeter quotes={quotes} />
      </section>

      {/* Cross-Asset Correlation Matrix */}
      <section>
        <CorrelationHeatmap quotes={quotes} />
      </section>

      {/* Comprehensive Watchlist Table */}
      <section className="space-y-3">
        <div>
          <h3 className="text-base font-semibold">Instrument Matrix</h3>
          <p className="text-xs text-muted-foreground">
            Filter by asset class, inspect daily range expansion, and launch technical analysis.
          </p>
        </div>
        <MarketsTable quotes={quotes} />
      </section>
    </div>
  );
}
```

---

## 🧪 Verification & Testing
1. Navigate to **`/markets`**.
2. Examine the **Relative Currency Strength Meter**:
   - Verify all 8 currencies are ranked from strongest to weakest with dynamic color bars.
   - Confirm the **Top Macro Divergence** callout displays the highest-edge directional currency pair (e.g. `GBP/JPY`).
3. Examine the **Cross-Asset Correlation Matrix**:
   - Verify diagonal cells show `+1.00`.
   - Observe real-time positive and inverse correlations (e.g., `EURUSD` vs `GBPUSD` positive correlation, `EURUSD` vs `USDCHF` inverse correlation).
   - Click on any cell to open the interactive risk advice callout.
4. Run `npx tsc --noEmit` to verify 0 compilation errors across the entire codebase.

