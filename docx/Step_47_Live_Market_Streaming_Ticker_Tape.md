# Step 47: Live Market Streaming Ticker Tape & Multi-Asset Price Marquee

## 🎯 Objective
Introduce an omnipresent, institutional-grade **Live Market Streaming Ticker Tape & Multi-Asset Price Marquee** across the universal application layout. In professional trading stations (e.g., Bloomberg Terminal, Refinitiv Eikon, institutional FX desks), traders require real-time visibility into global exchange rates, micro-tick directional flow, pip variations, and liquidity spreads regardless of which sub-page they are currently analyzing.

This step delivers:
1. **Ticker Mathematical & Streaming Engine (`lib/tickerUtils.ts`):** Calculates instrument pip changes, dynamic spreads, directional tick delta (`UP`, `DOWN`, `NEUTRAL`), and manages deterministic hydration-safe feeds.
2. **Interactive Streaming Ticker Tape Component (`components/market/LiveStreamingTickerTape.tsx`):** A sleek, horizontal streaming marquee powered by Framer Motion with live status indicator ("LIVE"), interactive play/pause controls, micro-tick flash animations (emerald for upticks, rose for downticks), spread badges, and click-to-view navigation.
3. **Universal Layout Integration (`app/(dashboard)/layout.tsx`):** Seamlessly mounts the streaming marquee directly beneath the universal header, ensuring persistent market pulse visibility across all pages.

---

## 🛠 Step-by-Step Implementation

### 1. Create Ticker Utility Engine (`lib/tickerUtils.ts`)
Create this utility to handle pip multipliers, spread constants, and tick direction states.

**File:** `lib/tickerUtils.ts`
```typescript
import { INSTRUMENTS } from "@/lib/constants/instruments";
import type { PriceQuote } from "@/types/market";

export type TickDirection = "UP" | "DOWN" | "NEUTRAL";

export type TickerItemData = {
  symbol: string;
  displayName: string;
  price: number | null;
  previousClose: number;
  changePercent: number;
  changePips: number;
  direction: TickDirection;
  spreadPips: number;
  decimals: number;
  category: "MAJOR" | "COMMODITY";
};

// Institutional average spreads in pips
const INSTITUTIONAL_SPREADS: Record<string, number> = {
  EURUSD: 0.8,
  GBPUSD: 1.1,
  USDJPY: 0.9,
  AUDUSD: 0.9,
  NZDUSD: 1.2,
  USDCAD: 1.1,
  USDCHF: 1.0,
  XAUUSD: 2.5,
};

/**
 * Builds structured ticker feed items with pip calculations and directional states.
 */
export function buildTickerFeed(
  quotes: PriceQuote[],
  prevPrices?: Record<string, number>
): TickerItemData[] {
  return INSTRUMENTS.map((inst) => {
    const quote = quotes.find((q) => q.symbol === inst.symbol);
    const price = quote?.price ?? null;
    const previousClose = quote?.previousClose ?? (price ?? 1.0);
    const decimals = inst.decimals;
    const multiplier = decimals === 5 ? 10000 : decimals === 3 ? 100 : 10;

    let changePercent = 0;
    let changePips = 0;
    let direction: TickDirection = "NEUTRAL";

    if (price !== null) {
      const diff = price - previousClose;
      changePercent = previousClose !== 0 ? Number(((diff / previousClose) * 100).toFixed(2)) : 0;
      changePips = Number((diff * multiplier).toFixed(1));

      if (prevPrices && prevPrices[inst.symbol] !== undefined) {
        const lastPrice = prevPrices[inst.symbol];
        if (price > lastPrice) direction = "UP";
        else if (price < lastPrice) direction = "DOWN";
        else direction = "NEUTRAL";
      } else {
        direction = changePercent > 0 ? "UP" : changePercent < 0 ? "DOWN" : "NEUTRAL";
      }
    }

    return {
      symbol: inst.symbol,
      displayName: inst.displayName,
      price,
      previousClose,
      changePercent,
      changePips,
      direction,
      spreadPips: INSTITUTIONAL_SPREADS[inst.symbol] ?? 1.0,
      decimals,
      category: inst.category,
    };
  });
}
```

#### Why this was written this way:
- **Centralized Pip Precision:** Correctly scales pip changes based on instrument decimal specifications (10,000 for standard FX, 100 for JPY pairs, 10 for Gold).
- **Directional State Delta:** Decouples price values from visual tick flashing, allowing the UI to trigger subtle green/red transitions only when price updates occur.
- **Strict Typing:** Completely avoids `any` by enforcing strong typing on every field ([`TickerItemData`](file:///c:/Users/ADMIN/Documents/MyWork/forex-pulse/lib/tickerUtils.ts), [`TickDirection`](file:///c:/Users/ADMIN/Documents/MyWork/forex-pulse/lib/tickerUtils.ts)).

---

### 2. Create Live Streaming Ticker Tape Component (`components/market/LiveStreamingTickerTape.tsx`)
Create this visual component with smooth horizontal scrolling, pause-on-hover, and live micro-tick flashing.

**File:** `components/market/LiveStreamingTickerTape.tsx`
```tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Pause, Play, TrendingUp, TrendingDown } from "lucide-react";
import { MOCK_QUOTES } from "@/lib/mock/quotes";
import type { PriceQuote } from "@/types/market";
import { buildTickerFeed, type TickerItemData } from "@/lib/tickerUtils";
import { formatPrice } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export function LiveStreamingTickerTape() {
  const [quotes, setQuotes] = useState<PriceQuote[]>(MOCK_QUOTES);
  const [prevPrices, setPrevPrices] = useState<Record<string, number>>({});
  const [flashingSymbols, setFlashingSymbols] = useState<Record<string, "UP" | "DOWN">>({});
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Client-side simulated micro-tick engine (interbank price pulse)
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setQuotes((currentQuotes) => {
        // Pick 1 random instrument to update
        const targetIndex = Math.floor(Math.random() * currentQuotes.length);
        const target = currentQuotes[targetIndex];
        if (!target || target.price === null) return currentQuotes;

        const isJpyOrGold = target.symbol === "USDJPY" || target.symbol === "XAUUSD";
        const deltaPip = (Math.random() * 0.8 - 0.4) * (isJpyOrGold ? 0.05 : 0.00008);
        const nextPrice = Number(
          (target.price + deltaPip).toFixed(
            target.symbol === "USDJPY" ? 3 : target.symbol === "XAUUSD" ? 2 : 5
          )
        );

        const dir: "UP" | "DOWN" = nextPrice >= target.price ? "UP" : "DOWN";

        // Save previous price for tick direction
        setPrevPrices((prev) => ({
          ...prev,
          [target.symbol]: target.price as number,
        }));

        // Flash badge for 1.2 seconds
        setFlashingSymbols((prev) => ({
          ...prev,
          [target.symbol]: dir,
        }));

        setTimeout(() => {
          setFlashingSymbols((prev) => {
            const next = { ...prev };
            delete next[target.symbol];
            return next;
          });
        }, 1200);

        return currentQuotes.map((q, idx) => (idx === targetIndex ? { ...q, price: nextPrice } : q));
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [isPaused]);

  const tickerItems = useMemo(() => {
    return buildTickerFeed(quotes, prevPrices);
  }, [quotes, prevPrices]);

  const shouldAnimate = !isPaused && !isHovered;

  return (
    <div
      className="relative flex h-9 items-center border-b border-border bg-card/60 backdrop-blur-sm text-xs select-none overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Institutional Live Feed Status Badge */}
      <div className="z-10 flex h-full items-center gap-1.5 border-r border-border bg-card px-3 shrink-0 shadow-sm">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="font-mono text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          LIVE TAPE
        </span>
        <button
          type="button"
          onClick={() => setIsPaused((prev) => !prev)}
          className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
          title={isPaused ? "Resume Live Stream" : "Pause Live Stream"}
        >
          {isPaused ? <Play className="h-3 w-3 text-amber-500" /> : <Pause className="h-3 w-3" />}
        </button>
      </div>

      {/* Marquee Ticker Track powered by Framer Motion infinite loop */}
      <motion.div
        className="flex items-center gap-6 whitespace-nowrap px-4"
        animate={shouldAnimate ? { x: ["0%", "-50%"] } : false}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: 35,
            ease: "linear",
          },
        }}
      >
        {/* Render items duplicated to produce infinite continuous flow */}
        {[...tickerItems, ...tickerItems].map((item: TickerItemData, index: number) => {
          const flash = flashingSymbols[item.symbol];
          const isUp = item.changePips >= 0;

          return (
            <Link
              key={`${item.symbol}-${index}`}
              href={`/markets?symbol=${item.symbol}`}
              className={cn(
                "inline-flex items-center gap-2 rounded px-2 py-0.5 transition-all hover:bg-muted/50 cursor-pointer shrink-0",
                flash === "UP" && "bg-emerald-500/20 text-emerald-400",
                flash === "DOWN" && "bg-rose-500/20 text-rose-400"
              )}
            >
              <span className="font-mono font-bold text-foreground">{item.displayName}</span>

              {/* Price with flash indicators */}
              <span className="font-mono text-[11px] text-foreground font-semibold">
                {formatPrice(item.price, item.decimals)}
              </span>

              {/* Pip & Percentage Change */}
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-mono text-[10px] font-medium",
                  isUp ? "text-emerald-500" : "text-rose-500"
                )}
              >
                {isUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                {isUp ? `+${item.changePips}` : `${item.changePips}`}p
              </span>

              {/* Spread pill */}
              <span className="text-[9px] font-mono text-muted-foreground/70 bg-muted/40 px-1 py-0.5 rounded border border-border/40">
                {item.spreadPips}p
              </span>
            </Link>
          );
        })}
      </motion.div>
    </div>
  );
}
```

#### Why this was written this way:
- **Infinite Seamless Marquee:** Translating from `"0%"` to `"-50%"` across duplicated items generates a flawless infinite loop with zero seam or jump.
- **Hydration Safe:** Initializes state with deterministic `MOCK_QUOTES` so that server-rendered HTML matches the client's initial DOM, eliminating React hydration errors.
- **Visual Pulse Animation:** Highlighting the background for 1200ms on a tick allows the trader to instantly notice which market just moved.
- **Pause-on-Hover & Manual Toggle:** Automatically freezes motion when hovering over any pair to allow inspection, or toggleable via the pause icon.

---

### 3. Mount in Universal Layout (`app/(dashboard)/layout.tsx`)
Embed the `LiveStreamingTickerTape` directly under the `Header` component.

**File:** `app/(dashboard)/layout.tsx`
```tsx
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { LiveStreamingTickerTape } from "@/components/market/LiveStreamingTickerTape";
import { CircuitBreakerBanner } from "@/components/layout/CircuitBreakerBanner";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <LiveStreamingTickerTape />
        <CircuitBreakerBanner />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

---

## 🧪 Verification & Testing
1. Navigate across any page (`/`, `/markets`, `/setups`, `/risk`, `/technical`).
2. Observe the **LIVE TAPE** ribbon immediately below the top header:
   - Green pulsating radar dot with "LIVE TAPE" label.
   - All 8 major pairs & Gold streaming in real-time.
   - Micro-tick price movements triggering subtle green/red highlight flashes.
   - Pips and spreads clearly formatted for each pair.
3. Hover over the ribbon or click the **Pause** icon to freeze ticker animation and updates.
4. Click on any instrument (e.g. `XAU/USD` or `EUR/USD`) to ensure it routes smoothly to the Markets Hub.
5. Run `npx tsc --noEmit` in your terminal to ensure 0 TypeScript compilation errors.

