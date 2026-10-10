# Step 9: Dashboard Overview & Currency Sparklines

## 🎯 Overview
In this step, we construct the main dashboard landing view. It synthesizes the Market Session Bar, News Risk Warning Banner, quick active setup cards, major currency pairs with price changes, directional biases, and SVG sparkline trajectories.

---

### 1. Main Dashboard Container (`app/(dashboard)/page.tsx`)

**File:** `app/(dashboard)/page.tsx`
```tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { INSTRUMENTS } from "@/lib/constants/instruments";
import { getQuotes } from "@/lib/services/marketData";
import { getEconomicEvents } from "@/lib/services/calendar";
import { getActiveSetups } from "@/lib/services/setups";
import { CurrencyCardGrid, type CurrencyCardItem } from "@/components/market/CurrencyCardGrid";
import { SessionBar } from "@/components/sessions/SessionBar";
import { NewsRiskBanner } from "@/components/calendar/NewsRiskBanner";
import { UpcomingEventsPanel } from "@/components/calendar/UpcomingEventsPanel";
import { SetupGrid } from "@/components/setups/SetupGrid";

export default async function DashboardPage() {
  const [quotes, events, setups] = await Promise.all([
    getQuotes(), 
    getEconomicEvents(),
    getActiveSetups()
  ]);

  const items: CurrencyCardItem[] = INSTRUMENTS.map((instrument) => ({
    instrument,
    quote: quotes.find((quote) => quote.symbol === instrument.symbol) ?? null,
  }));

  return (
    <div className="space-y-6">
      <NewsRiskBanner events={events} />

      <SessionBar />

      {/* Mini-version of Active Setups */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Active Setups</h2>
            <p className="text-sm text-muted-foreground">Trades waiting for entry or currently active.</p>
          </div>
          <Link href="/setups" className="flex items-center text-sm font-medium text-primary hover:underline">
            View All <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        <SetupGrid setups={setups.slice(0, 3)} />
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold tracking-tight">Market Overview</h2>
          <p className="text-sm text-muted-foreground">Majors and gold — current price, daily change and bias.</p>
        </div>
        <CurrencyCardGrid items={items} />
      </section>

      <UpcomingEventsPanel events={events} />
    </div>
  );
}
```

---

### 2. Currency Card Component (`components/market/CurrencyCard.tsx`)

**File:** `components/market/CurrencyCard.tsx`
```tsx
"use client";

import { motion, type Variants } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import type { Instrument, PriceQuote } from "@/types/market";
import { calculateChange, formatPercent, formatPrice, formatTimePHT } from "@/lib/formatters";
import { BiasBadge } from "@/components/market/BiasBadge";
import { DataStatusBadge } from "@/components/market/DataStatusBadge";
import { Sparkline } from "@/components/market/Sparkline";
import { cn } from "@/lib/utils";

export const CARD_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

type CurrencyCardProps = {
  instrument: Instrument;
  quote: PriceQuote | null;
};

export function CurrencyCard({ instrument, quote }: CurrencyCardProps) {
  const hasPrice = quote !== null && quote.price !== null;
  const change = quote ? calculateChange(quote.price, quote.previousClose) : null;

  return (
    <motion.article
      variants={CARD_VARIANTS}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold tracking-tight">{instrument.displayName}</h3>
          <p className="text-xs text-muted-foreground">
            {instrument.category === "COMMODITY" ? "Commodity" : "Major"}
          </p>
        </div>
        {quote && <BiasBadge bias={quote.bias} />}
      </div>

      {hasPrice ? (
        <>
          {/* Price + change */}
          <div className="mt-4 flex items-end justify-between gap-2">
            <p className="text-2xl font-semibold tabular-nums tracking-tight">
              {formatPrice(quote.price, instrument.decimals)}
            </p>
            {change && (
              <p
                className={cn(
                  "text-sm font-medium tabular-nums",
                  change.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                )}
              >
                {formatPercent(change.percent)}
              </p>
            )}
          </div>

          {/* Sparkline trend */}
          <div className="mt-3">
            <Sparkline
              points={quote.sparkline}
              isPositive={change ? change.isPositive : true}
            />
          </div>

          {/* Footer timestamp */}
          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{formatTimePHT(quote.updatedAt)}</span>
            <DataStatusBadge isLive={quote.isLive} />
          </div>
        </>
      ) : (
        <div className="mt-6 flex items-center gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          <AlertTriangle className="h-4 w-4" />
          <span>No market data available</span>
        </div>
      )}
    </motion.article>
  );
}
```

---

### 3. Lightweight SVG Sparkline Component (`components/market/Sparkline.tsx`)

**File:** `components/market/Sparkline.tsx`
```tsx
"use client";

export function Sparkline({ points, isPositive }: { points: number[]; isPositive: boolean }) {
  if (!points || points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const height = 28;
  const width = 120;

  const pathPoints = points
    .map((val, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible w-full">
      <polyline
        fill="none"
        stroke={isPositive ? "#10b981" : "#f43f5e"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pathPoints}
      />
    </svg>
  );
}
```

#### Why this was written this way:
- **Zero Third-Party Charting Overhead:** Generates standard SVG `<polyline>` tags from an array of numbers, rendering instant 24h trend lines with zero bundle size cost.
- **`Promise.all` Server Aggregation:** Concurrently executes requests for quotes, calendar events, and active setups on the server, avoiding sequential waterfall delays.
