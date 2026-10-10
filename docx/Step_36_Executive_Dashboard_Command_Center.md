# Step 36: Executive Dashboard Command Center & Market Pulse Radar

## 🎯 Objective
Upgrade the central overview page (`/`) into an institutional **Executive Forex Command Center**. This step delivers:
1. **Executive Briefing & Macro Threat Bar (`components/dashboard/ExecutiveBriefingBar.tsx`):** Unifies real-time market session status, imminent high-impact news warnings (No-Trade Zone indicators), and open portfolio risk metrics into an executive status bar.
2. **Top Market Movers & Volatility Radar Strip (`components/dashboard/MarketMoversStrip.tsx`):** Automatically computes and displays the day's Top Gainer, Top Decliner, Highest Volatility instrument, and aggregate US Dollar directional bias.
3. **Latest Intelligence Dispatch Card (`components/dashboard/LatestReportWidget.tsx`):** Previews key takeaways, focus pairs, and risk playbooks from the most recent AI session report.
4. **Unified Command Center Layout (`app/(dashboard)/page.tsx`):** Coordinates parallel server data fetching across quotes, active setups, economic releases, and session reports into a structured command console.

---

## 🛠 Step-by-Step Implementation

### 1. Create Dashboard Analytical Utilities (`lib/dashboardUtils.ts`)
Create utilities to calculate 24-hour leaders, volatility spreads, and macro USD directional bias.

**File:** `lib/dashboardUtils.ts`
```typescript
import type { PriceQuote } from "@/types/market";

export type MarketMover = {
  symbol: string;
  changePercent: number;
  currentPrice: number;
};

export type MarketMoversSummary = {
  topGainer: MarketMover | null;
  topDecliner: MarketMover | null;
  mostVolatile: { symbol: string; spreadPercent: number } | null;
  aggregateUsdBias: "BULLISH" | "BEARISH" | "MIXED";
};

/**
 * Computes 24h gainers, decliners, volatility spreads, and overall USD directional bias.
 */
export function calculateMarketMovers(quotes: PriceQuote[]): MarketMoversSummary {
  const validQuotes = quotes.filter((q) => q.price !== null && q.previousClose !== null && q.previousClose > 0);

  if (validQuotes.length === 0) {
    return {
      topGainer: null,
      topDecliner: null,
      mostVolatile: null,
      aggregateUsdBias: "MIXED",
    };
  }

  const movers: MarketMover[] = validQuotes.map((q) => {
    const price = q.price!;
    const prev = q.previousClose!;
    const changePercent = Number((((price - prev) / prev) * 100).toFixed(2));
    return { symbol: q.symbol, changePercent, currentPrice: price };
  });

  const sorted = [...movers].sort((a, b) => b.changePercent - a.changePercent);
  const topGainer = sorted[0]?.changePercent > 0 ? sorted[0] : null;
  const topDecliner = sorted[sorted.length - 1]?.changePercent < 0 ? sorted[sorted.length - 1] : null;

  // Compute highest volatility range: (high - low) / price * 100
  let mostVolatile: { symbol: string; spreadPercent: number } | null = null;
  let maxSpread = 0;

  for (const q of validQuotes) {
    if (q.high !== null && q.low !== null && q.price !== null && q.price > 0) {
      const spreadPercent = Number((((q.high - q.low) / q.price) * 100).toFixed(2));
      if (spreadPercent > maxSpread) {
        maxSpread = spreadPercent;
        mostVolatile = { symbol: q.symbol, spreadPercent };
      }
    }
  }

  // Aggregate USD bias calculation
  let usdBullishScore = 0;
  let usdBearishScore = 0;

  for (const m of movers) {
    // If USD is quote (EURUSD, GBPUSD, AUDUSD, NZDUSD, XAUUSD): negative change means USD is stronger
    if (["EURUSD", "GBPUSD", "AUDUSD", "NZDUSD", "XAUUSD"].includes(m.symbol)) {
      if (m.changePercent < 0) usdBullishScore += 1;
      else if (m.changePercent > 0) usdBearishScore += 1;
    }
    // If USD is base (USDJPY, USDCAD, USDCHF): positive change means USD is stronger
    if (["USDJPY", "USDCAD", "USDCHF"].includes(m.symbol)) {
      if (m.changePercent > 0) usdBullishScore += 1;
      else if (m.changePercent < 0) usdBearishScore += 1;
    }
  }

  let aggregateUsdBias: "BULLISH" | "BEARISH" | "MIXED" = "MIXED";
  if (usdBullishScore >= usdBearishScore + 2) aggregateUsdBias = "BULLISH";
  else if (usdBearishScore >= usdBullishScore + 2) aggregateUsdBias = "BEARISH";

  return {
    topGainer,
    topDecliner,
    mostVolatile,
    aggregateUsdBias,
  };
}
```

#### Why this was written this way:
- **Base/Quote Directional Alignment:** Accurately accounts for whether the US Dollar is the base or quote currency when scoring aggregate USD strength.
- **Null Safety:** Guards against `null` price fields to prevent `NaN` values from disrupting metric displays.

---

### 2. Create Executive Briefing Bar (`components/dashboard/ExecutiveBriefingBar.tsx`)
Create a top-level briefing bar combining session timing, macro risk level, and open exposure capacity.

**File:** `components/dashboard/ExecutiveBriefingBar.tsx`
```tsx
"use client";

import Link from "next/link";
import { ShieldCheck, AlertOctagon, PlusCircle, ArrowUpRight } from "lucide-react";
import type { TradingSetup } from "@/types/setup";
import type { EconomicEvent } from "@/types/calendar";
import { useNow } from "@/hooks/useNow";
import { getNextHighImpactEvent } from "@/lib/calendar";
import { formatDuration } from "@/lib/formatters";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ExecutiveBriefingBarProps {
  activeSetups: TradingSetup[];
  events: EconomicEvent[];
}

export function ExecutiveBriefingBar({ activeSetups, events }: ExecutiveBriefingBarProps) {
  const now = useNow();

  const nextHigh = now ? getNextHighImpactEvent(events, now) : null;
  const isNoTradeZone = nextHigh ? nextHigh.msUntil <= 30 * 60 * 1000 : false;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {/* Macro Threat Status */}
        {isNoTradeZone ? (
          <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
            <AlertOctagon className="h-4 w-4 animate-pulse" />
            <span>NO-TRADE ZONE: {nextHigh?.event.title} in {formatDuration(nextHigh!.msUntil)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span>Macro Horizon Clear</span>
          </div>
        )}

        {/* Portfolio Exposure Status */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground border-l border-border pl-3">
          <span>Active Setups:</span>
          <span className="font-mono font-bold text-foreground">{activeSetups.length} Open</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        <Link
          href="/risk"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "h-8 text-xs font-semibold gap-1"
          )}
        >
          Risk Radar
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
        <Link
          href="/setups"
          className={cn(
            buttonVariants({ variant: "default", size: "sm" }),
            "h-8 text-xs font-semibold gap-1.5"
          )}
        >
          <PlusCircle className="h-3.5 w-3.5" />
          Log Setup
        </Link>
      </div>
    </div>
  );
}
```

---

### 3. Create Market Movers Strip (`components/dashboard/MarketMoversStrip.tsx`)
Create a real-time market pulse strip showing 24h market leaders, decliners, volatility, and USD bias.

**File:** `components/dashboard/MarketMoversStrip.tsx`
```tsx
"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Activity, DollarSign } from "lucide-react";
import type { PriceQuote } from "@/types/market";
import { calculateMarketMovers } from "@/lib/dashboardUtils";
import { cn } from "@/lib/utils";

interface MarketMoversStripProps {
  quotes: PriceQuote[];
}

export function MarketMoversStrip({ quotes }: MarketMoversStripProps) {
  const movers = useMemo(() => calculateMarketMovers(quotes), [quotes]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {/* Top Gainer */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground mb-1">
          <span className="text-[11px] font-medium uppercase tracking-wider">Top Gainer (24h)</span>
          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
        </div>
        {movers.topGainer ? (
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-sm">{movers.topGainer.symbol}</span>
              <span className="text-xs font-bold font-mono text-emerald-500">
                +{movers.topGainer.changePercent}%
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">{movers.topGainer.currentPrice}</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">Flat market</p>
        )}
      </div>

      {/* Top Decliner */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground mb-1">
          <span className="text-[11px] font-medium uppercase tracking-wider">Top Decliner (24h)</span>
          <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
        </div>
        {movers.topDecliner ? (
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-sm">{movers.topDecliner.symbol}</span>
              <span className="text-xs font-bold font-mono text-rose-500">
                {movers.topDecliner.changePercent}%
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">{movers.topDecliner.currentPrice}</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">Flat market</p>
        )}
      </div>

      {/* Highest Volatility */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground mb-1">
          <span className="text-[11px] font-medium uppercase tracking-wider">High Volatility</span>
          <Activity className="h-3.5 w-3.5 text-primary" />
        </div>
        {movers.mostVolatile ? (
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-sm">{movers.mostVolatile.symbol}</span>
              <span className="text-xs font-bold font-mono text-primary">
                {movers.mostVolatile.spreadPercent}% Spread
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">Daily High/Low Range</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">Calm volatility</p>
        )}
      </div>

      {/* Aggregate USD Bias */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground mb-1">
          <span className="text-[11px] font-medium uppercase tracking-wider">USD Macro Bias</span>
          <DollarSign className="h-3.5 w-3.5 text-amber-500" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              "font-bold text-sm font-mono",
              movers.aggregateUsdBias === "BULLISH"
                ? "text-emerald-500"
                : movers.aggregateUsdBias === "BEARISH"
                ? "text-rose-500"
                : "text-muted-foreground"
            )}
          >
            {movers.aggregateUsdBias}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground">Cross-currency strength</p>
      </div>
    </div>
  );
}
```

---

### 4. Create Latest Report Dispatch Card (`components/dashboard/LatestReportWidget.tsx`)
Create a preview widget summarizing the latest AI session report.

**File:** `components/dashboard/LatestReportWidget.tsx`
```tsx
"use client";

import Link from "next/link";
import { FileText, ArrowRight, ShieldCheck, Flame } from "lucide-react";
import type { SessionReport } from "@/types/report";
import { formatClockPHT } from "@/lib/formatters";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LatestReportWidgetProps {
  report: SessionReport | null;
}

export function LatestReportWidget({ report }: LatestReportWidgetProps) {
  if (!report) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 p-5 text-center space-y-2">
        <FileText className="h-6 w-6 text-muted-foreground/40 mx-auto" />
        <p className="text-xs font-medium">No session reports generated yet.</p>
        <Link
          href="/reports"
          className={cn(buttonVariants({ size: "sm", variant: "outline" }), "text-xs h-7")}
        >
          Generate Report
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between border-b border-border pb-2.5">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-xs uppercase tracking-wider">
            Latest AI Intelligence Dispatch
          </h4>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">
          {formatClockPHT(report.timestamp)} PHT
        </span>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-foreground">{report.title}</span>
          <span className="rounded bg-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
            {report.bias}
          </span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {report.executiveSummary}
        </p>
      </div>

      {/* Focus Pairs & Link */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Focus:</span>
          {report.playbook.focusPairs.map((p) => (
            <span key={p} className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-mono font-medium">
              {p}
            </span>
          ))}
        </div>
        <Link
          href="/reports"
          className="text-primary hover:underline text-xs font-semibold inline-flex items-center gap-1"
        >
          Read Briefing <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
```

---

### 5. Upgrade Overview Dashboard Page (`app/(dashboard)/page.tsx`)
Incorporate the Executive Briefing, Market Movers, Active Setups, Currency Watchlist, Imminent Events, and Latest Session Report Dispatch.

**File:** `app/(dashboard)/page.tsx`
```tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { INSTRUMENTS } from "@/lib/constants/instruments";
import { getQuotes } from "@/lib/services/marketData";
import { getEconomicEvents } from "@/lib/services/calendar";
import { getActiveSetups } from "@/lib/services/setups";
import { getLatestReport } from "@/lib/services/reports";
import { ExecutiveBriefingBar } from "@/components/dashboard/ExecutiveBriefingBar";
import { MarketMoversStrip } from "@/components/dashboard/MarketMoversStrip";
import { LatestReportWidget } from "@/components/dashboard/LatestReportWidget";
import { SessionBar } from "@/components/sessions/SessionBar";
import { CurrencyCardGrid, type CurrencyCardItem } from "@/components/market/CurrencyCardGrid";
import { SetupGrid } from "@/components/setups/SetupGrid";
import { UpcomingEventsPanel } from "@/components/calendar/UpcomingEventsPanel";

export default async function DashboardPage() {
  const [quotes, events, setups, latestReport] = await Promise.all([
    getQuotes(),
    getEconomicEvents(),
    getActiveSetups(),
    getLatestReport(),
  ]);

  const items: CurrencyCardItem[] = INSTRUMENTS.map((instrument) => ({
    instrument,
    quote: quotes.find((quote) => quote.symbol === instrument.symbol) ?? null,
  }));

  return (
    <div className="space-y-6 max-w-6xl">
      {/* 1. Executive Briefing Bar */}
      <ExecutiveBriefingBar activeSetups={setups} events={events} />

      {/* 2. Global Market Session Bar */}
      <SessionBar />

      {/* 3. Market Movers & USD Macro Bias Strip */}
      <MarketMoversStrip quotes={quotes} />

      {/* 4. Active Setups Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Active Trade Setups</h2>
            <p className="text-xs text-muted-foreground">Trades awaiting entry confirmation or actively running.</p>
          </div>
          <Link href="/setups" className="flex items-center text-xs font-semibold text-primary hover:underline gap-1">
            View All Setups ({setups.length}) <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <SetupGrid setups={setups.slice(0, 3)} />
      </section>

      {/* 5. Two-Column Intelligence Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left Column: Watchlist Overview */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Watchlist Overview</h2>
              <p className="text-xs text-muted-foreground">Current prices, 24h change, and sparkline trends.</p>
            </div>
            <Link href="/markets" className="text-xs font-semibold text-primary hover:underline">
              Markets Hub →
            </Link>
          </div>
          <CurrencyCardGrid items={items} />
        </section>

        {/* Right Column: Macro Catalysts & Latest Report Dispatch */}
        <div className="space-y-6">
          <LatestReportWidget report={latestReport} />
          <UpcomingEventsPanel events={events} />
        </div>
      </div>
    </div>
  );
}
```

---

## 🧪 Verification & Testing
1. Navigate to `http://localhost:3000/` in your browser.
2. Verify that the **Executive Briefing Bar** displays current macro threat status and active setups count.
3. Confirm that the **Market Movers Strip** renders the Top Gainer, Top Decliner, Highest Volatility instrument, and USD Macro Bias.
4. Verify that the **Latest AI Intelligence Dispatch** card displays the executive summary and focus pairs from your most recent session report.
5. Confirm that the **Active Setups** section and **Watchlist Overview** render cleanly side-by-side with the macro panel.

