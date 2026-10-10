# Step 27: Markets Hub & Comprehensive Watchlist Table

## 🎯 Objective
Transform the placeholder route at `/markets` into a professional, real-time Forex & Commodity Watchlist Hub. The page aggregates all 8 core instruments (`EURUSD`, `GBPUSD`, `USDJPY`, `AUDUSD`, `NZDUSD`, `USDCAD`, `USDCHF`, and `XAUUSD`), calculating daily pip movements, intra-day range boundaries (High/Low progress meters), directional bias indicators, SVG sparklines, and market summary statistics (Top Gainer, Top Loser, Most Volatile, and Market Regime).

---

## 🛠 Step-by-Step Implementation

### 1. Extend Price Formatters for Pip & Volatility Calculations (`lib/formatters.ts`)
Add mathematical helper functions to convert price differentials into standardized pip movements and calculate intra-day range amplitudes based on instrument decimal rules.

**File:** `lib/formatters.ts`
```typescript
/**
 * Calculates pip movement based on instrument decimal precision.
 * - 5-decimal pairs: 1 pip = 0.0001 (diff * 10,000)
 * - 3-decimal pairs (JPY): 1 pip = 0.01 (diff * 100)
 * - 2-decimal commodities (Gold): 1 pt = 0.10 (diff * 10)
 */
export function calculatePipChange(
  price: number | null,
  previousClose: number | null,
  decimals: number
): number {
  if (price === null || previousClose === null) return 0;
  const multiplier = decimals === 5 ? 10000 : decimals === 3 ? 100 : 10;
  return Number(((price - previousClose) * multiplier).toFixed(1));
}

/**
 * Calculates the total intra-day range (High - Low) in pips.
 */
export function calculateDailyRangePips(
  high: number | null,
  low: number | null,
  decimals: number
): number {
  if (high === null || low === null) return 0;
  const multiplier = decimals === 5 ? 10000 : decimals === 3 ? 100 : 10;
  return Number(((high - low) * multiplier).toFixed(1));
}
```

#### Why this was written this way:
- **Pip Multiplier Normalization:** Institutional Forex quotes measure pip movements differently across majors (5th decimal pipettes), JPY crosses (3rd decimal pipettes), and precious metals (XAU/USD). Centralizing pip arithmetic inside `lib/formatters.ts` prevents disparate math scattered across UI cards.
- **`toFixed(1)` Rounding:** Fractional pips (pipettes) are safely rounded to one decimal place to avoid JavaScript floating point errors (e.g. `12.300000000000002`).

---

### 2. Create Market Overview Stat Cards (`components/market/MarketsSummaryCards.tsx`)
Create a high-level macroeconomic summary section displaying Top Gainer, Top Loser, Highest Volatility, and General Market Sentiment. Note that in this project, market domain components reside under `components/market/`.

**File:** `components/market/MarketsSummaryCards.tsx`
```tsx
"use client";

import { TrendingUp, TrendingDown, Flame, Globe2 } from "lucide-react";
import type { PriceQuote } from "@/types/market";
import { INSTRUMENTS } from "@/lib/constants/instruments";
import { calculateChange, calculateDailyRangePips, formatPercent } from "@/lib/formatters";

interface MarketsSummaryCardsProps {
  quotes: PriceQuote[];
}

export function MarketsSummaryCards({ quotes }: MarketsSummaryCardsProps) {
  const analyzedQuotes = quotes.map((q) => {
    const inst = INSTRUMENTS.find((i) => i.symbol === q.symbol);
    const decimals = inst?.decimals ?? 5;
    const change = calculateChange(q.price, q.previousClose);
    const rangePips = calculateDailyRangePips(q.high, q.low, decimals);
    return { ...q, change, rangePips, displayName: inst?.displayName ?? q.symbol };
  });

  // 1. Top Gainer & Loser
  const validChanges = analyzedQuotes.filter((q) => q.change !== null);
  const topGainer = [...validChanges].sort((a, b) => (b.change?.percent ?? 0) - (a.change?.percent ?? 0))[0];
  const topLoser = [...validChanges].sort((a, b) => (a.change?.percent ?? 0) - (b.change?.percent ?? 0))[0];

  // 2. Highest Volatility
  const mostVolatile = [...analyzedQuotes].sort((a, b) => b.rangePips - a.rangePips)[0];

  // 3. Overall Market Sentiment
  const bullishCount = quotes.filter((q) => q.bias === "BULLISH").length;
  const sentiment = bullishCount >= quotes.length / 2 ? "Risk-On (Bullish USD/Equities)" : "Risk-Off (Defensive Flow)";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Top Gainer */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium">Top Gainer (24h)</span>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <h4 className="text-lg font-bold tracking-tight">{topGainer?.displayName ?? "—"}</h4>
          <span className="text-xs font-semibold text-emerald-500 tabular-nums">
            {topGainer?.change ? formatPercent(topGainer.change.percent) : "0.00%"}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Leading currency pair momentum</p>
      </div>

      {/* Top Loser */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium">Top Loser (24h)</span>
          <TrendingDown className="h-4 w-4 text-rose-500" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <h4 className="text-lg font-bold tracking-tight">{topLoser?.displayName ?? "—"}</h4>
          <span className="text-xs font-semibold text-rose-500 tabular-nums">
            {topLoser?.change ? formatPercent(topLoser.change.percent) : "0.00%"}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Deepest intra-day retracement</p>
      </div>

      {/* Highest Volatility */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium">Most Active Range</span>
          <Flame className="h-4 w-4 text-amber-500" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <h4 className="text-lg font-bold tracking-tight">{mostVolatile?.displayName ?? "—"}</h4>
          <span className="text-xs font-semibold text-amber-500 tabular-nums">
            {mostVolatile?.rangePips} pips
          </span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Maximum daily price expansion</p>
      </div>

      {/* Market Sentiment */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium">Market Regime</span>
          <Globe2 className="h-4 w-4 text-sky-500" />
        </div>
        <div className="mt-2">
          <h4 className="text-sm font-bold tracking-tight truncate">{sentiment}</h4>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">{bullishCount} of {quotes.length} assets with Bullish bias</p>
      </div>
    </div>
  );
}
```

#### Why this was written this way:
- **Instant Macro Context:** Before opening a single chart, traders immediately see which asset has the most momentum, which is selling off, and which offers the widest pip range for intra-day execution.
- **Dynamic Derivation:** Statistics are derived dynamically from quotes without needing a separate backend service, ensuring zero additional network overhead.

---

### 3. Create Interactive Markets Watchlist Table (`components/market/MarketsTable.tsx`)
Create an interactive table component featuring category filtering (All / Forex Majors / Commodities), search, intra-day High-to-Low range progress meters, SVG sparklines, and direct navigation links styled with `buttonVariants`.

**File:** `components/market/MarketsTable.tsx`
```tsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus, LineChart, Search } from "lucide-react";
import type { PriceQuote, InstrumentCategory } from "@/types/market";
import { INSTRUMENTS } from "@/lib/constants/instruments";
import { formatPrice, calculateChange, formatPercent, calculatePipChange, calculateDailyRangePips } from "@/lib/formatters";
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
```

#### Why this was written this way:
- **Base UI Button Alignment (`buttonVariants`):** In Base UI (`@base-ui/react`), `Button` does not implement Radix's `asChild`. By wrapping Next.js `<Link>` directly with `buttonVariants({ variant: "ghost", size: "sm" })`, we achieve type safety with zero runtime component mismatch.
- **Sparkline Props Compatibility:** `Sparkline` accepts `data`, `isPositive`, and `className` (responsive SVG viewBox). Specifying `className="h-7 w-24"` avoids invalid width/height props.
- **Folder Path Alignment (`components/market/`):** Matches the existing folder naming convention where all market-related components reside in `components/market/`.

---

### 4. Create Markets Dashboard Page Route (`app/(dashboard)/markets/page.tsx`)
Replace the temporary `PagePlaceholder` with a server component that fetches quotes from `getQuotes()` and renders the complete Markets interface.

**File:** `app/(dashboard)/markets/page.tsx`
```tsx
import { CandlestickChart } from "lucide-react";
import { getQuotes } from "@/lib/services/marketData";
import { MarketsSummaryCards } from "@/components/market/MarketsSummaryCards";
import { MarketsTable } from "@/components/market/MarketsTable";

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
            Real-time price quotes, daily volatility ranges, and momentum across all tracked instruments.
          </p>
        </div>
      </div>

      {/* Top Statistical Cards */}
      <section>
        <MarketsSummaryCards quotes={quotes} />
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

#### Why this was written this way:
- **Correct Import Paths:** Imports from `@/components/market/MarketsSummaryCards` and `@/components/market/MarketsTable` (singular `market`) matching the file system.
- **Server Component Performance:** Pre-fetches market data on the server via `await getQuotes()`, ensuring instant initial page loads and zero layout shifts.

---

## 🧪 Verification & Testing
1. Navigate to `http://localhost:3000/markets` via the sidebar navigation item.
2. Confirm that the 4 macro summary cards render with Top Gainer, Top Loser, Volatility, and Regime.
3. Verify that the table displays all 8 currency pairs and commodities with accurate decimal formatting (e.g. 5 decimals for EUR/USD, 3 for USD/JPY, 2 for Gold).
4. Verify that the intra-day range progress bar fills proportionally according to price position.
5. Click the "Analyze" button on any row and verify smooth navigation to `/technical`.
