# Step 41: Active Trade Live Pip Distance Gauge & Capital Protection Radar

## 🎯 Objective
Transform Forex Pulse's active trading workspace into a real-time execution cockpit with live pip-tracking, dynamic R-multiple analytics, and capital preservation discipline. This step delivers:
1. **Pip Distance & Floating R-Multiple Engine (`lib/tradeProgressUtils.ts`):** High-precision calculation module computing live pip distances from current market price to Entry, Target 1, and Stop Loss; calculating floating R-multiples; and evaluating protection triggers across 5-decimal FX pairs, 3-decimal JPY crosses, and commodities (Gold), with strict null-safety for unverified market feeds.
2. **Interactive Active Trade Progress Gauge (`components/setups/ActiveTradeProgressGauge.tsx`):** A visual gauge displaying live market progress across risk/reward zones with an animated cursor, real-time pips-to-target countdown, and a one-click Breakeven capital protection banner when profit exceeds `+1.0R`.
3. **Pending Setup Entry Proximity Radar:** For setups in `WAITING_FOR_CONFIRMATION`, dynamically displays exact pip distance to the entry zone and triggers an instant "Inside Entry Zone" alert when price tests the designated level.
4. **Active Setups Grid & Controller Integration (`components/setups/SetupCard.tsx`, `components/setups/SetupGrid.tsx`, `app/(dashboard)/setups/page.tsx`):** Connects real-time streaming quotes directly to active cards on `/setups`.

---

## 🛠 Step-by-Step Implementation

### 1. Create Trade Progress & Protection Engine (`lib/tradeProgressUtils.ts`)
This utility computes real-time distances in pips, calculates current floating R-multiples, and evaluates capital protection rules with strict `quote.price === null` guarding.

**File:** `lib/tradeProgressUtils.ts`
```typescript
import type { TradingSetup } from "@/types/setup";
import type { PriceQuote } from "@/types/market";
import { INSTRUMENTS } from "@/lib/constants/instruments";

export type TradeProtectionStatus =
  | "TARGET_REACHED"
  | "TARGET_IMMINENT"
  | "BREAKEVEN_RECOMMENDED"
  | "IN_PROFIT"
  | "AT_ENTRY"
  | "IN_DRAWDOWN"
  | "STOP_IMMINENT"
  | "STOP_HIT";

export type ActiveTradeMetrics = {
  currentPrice: number;
  entryMid: number;
  multiplier: number;
  decimals: number;
  pnlPips: number;
  floatingR: number;
  pipsToTarget: number;
  pipsToStop: number;
  totalTargetPips: number;
  totalStopPips: number;
  progressPercent: number; // -100% (Stop Hit) to +100% (Target 1 Reached)
  protectionStatus: TradeProtectionStatus;
  statusLabel: string;
  isBreakevenEligible: boolean;
};

export type PendingTradeProximity = {
  currentPrice: number;
  entryMin: number;
  entryMax: number;
  multiplier: number;
  isInsideZone: boolean;
  pipsFromZone: number;
  directionToZone: "ABOVE" | "BELOW" | "INSIDE";
};

/**
 * Calculates live pip distance, floating R-multiple, and capital protection status for active trades.
 * Returns null if the market feed is unavailable or unverified (price is null).
 */
export function calculateActiveTradeMetrics(
  setup: TradingSetup,
  quote: PriceQuote
): ActiveTradeMetrics | null {
  if (quote.price === null) return null;

  const instrument = INSTRUMENTS.find((i) => i.symbol === setup.symbol);
  const decimals = instrument?.decimals ?? 5;
  const multiplier = decimals === 5 ? 10000 : decimals === 3 ? 100 : 10;

  const currentPrice = quote.price;
  const entryMid = (setup.entryMin + setup.entryMax) / 2;
  const isLong = setup.direction === "LONG";

  const totalTargetPips = Number((Math.abs(setup.takeProfit1 - entryMid) * multiplier).toFixed(1));
  const totalStopPips = Number((Math.abs(entryMid - setup.stopLoss) * multiplier).toFixed(1));
  const safeStopPips = totalStopPips > 0 ? totalStopPips : 1;

  // Floating PnL in pips from entry midpoint
  const pnlPips = Number(
    ((isLong ? currentPrice - entryMid : entryMid - currentPrice) * multiplier).toFixed(1)
  );

  // Floating R-Multiple
  const floatingR = Number((pnlPips / safeStopPips).toFixed(2));

  // Pips to Target 1 and Stop Loss
  const pipsToTarget = Number(
    ((isLong ? setup.takeProfit1 - currentPrice : currentPrice - setup.takeProfit1) * multiplier).toFixed(1)
  );
  const pipsToStop = Number(
    ((isLong ? currentPrice - setup.stopLoss : setup.stopLoss - currentPrice) * multiplier).toFixed(1)
  );

  // Normalized progress percentage: 0% at entry, 100% at TP1, -100% at SL
  let progressPercent = 0;
  if (pnlPips >= 0) {
    progressPercent = Math.min(100, Math.round((pnlPips / (totalTargetPips || 1)) * 100));
  } else {
    progressPercent = Math.max(-100, Math.round((pnlPips / safeStopPips) * 100));
  }

  // Determine Capital Protection Advisory
  let protectionStatus: TradeProtectionStatus = "AT_ENTRY";
  let statusLabel = "At Entry Zone";

  if (pipsToTarget <= 0) {
    protectionStatus = "TARGET_REACHED";
    statusLabel = "Take Profit 1 Reached";
  } else if (pipsToStop <= 0) {
    protectionStatus = "STOP_HIT";
    statusLabel = "Stop Loss Hit";
  } else if (pipsToTarget <= 8) {
    protectionStatus = "TARGET_IMMINENT";
    statusLabel = `TP1 Imminent (${pipsToTarget} pips away)`;
  } else if (pipsToStop <= 8) {
    protectionStatus = "STOP_IMMINENT";
    statusLabel = `SL Warning (${pipsToStop} pips to stop)`;
  } else if (floatingR >= 1.0) {
    protectionStatus = "BREAKEVEN_RECOMMENDED";
    statusLabel = `+${floatingR}R Profit • Move SL to Breakeven`;
  } else if (floatingR > 0) {
    protectionStatus = "IN_PROFIT";
    statusLabel = `Floating +${pnlPips} pips (+${floatingR}R)`;
  } else if (floatingR < 0) {
    protectionStatus = "IN_DRAWDOWN";
    statusLabel = `Floating ${pnlPips} pips (${floatingR}R)`;
  }

  const isBreakevenEligible = floatingR >= 1.0;

  return {
    currentPrice,
    entryMid,
    multiplier,
    decimals,
    pnlPips,
    floatingR,
    pipsToTarget,
    pipsToStop,
    totalTargetPips,
    totalStopPips,
    progressPercent,
    protectionStatus,
    statusLabel,
    isBreakevenEligible,
  };
}

/**
 * Calculates proximity to entry zone for pending setups (WAITING_FOR_CONFIRMATION).
 * Returns null if the market feed is unavailable or unverified (price is null).
 */
export function calculatePendingTradeProximity(
  setup: TradingSetup,
  quote: PriceQuote
): PendingTradeProximity | null {
  if (quote.price === null) return null;

  const instrument = INSTRUMENTS.find((i) => i.symbol === setup.symbol);
  const decimals = instrument?.decimals ?? 5;
  const multiplier = decimals === 5 ? 10000 : decimals === 3 ? 100 : 10;
  const currentPrice = quote.price;

  const min = Math.min(setup.entryMin, setup.entryMax);
  const max = Math.max(setup.entryMin, setup.entryMax);

  if (currentPrice >= min && currentPrice <= max) {
    return {
      currentPrice,
      entryMin: min,
      entryMax: max,
      multiplier,
      isInsideZone: true,
      pipsFromZone: 0,
      directionToZone: "INSIDE",
    };
  }

  if (currentPrice > max) {
    const pipsFromZone = Number(((currentPrice - max) * multiplier).toFixed(1));
    return {
      currentPrice,
      entryMin: min,
      entryMax: max,
      multiplier,
      isInsideZone: false,
      pipsFromZone,
      directionToZone: "ABOVE",
    };
  }

  const pipsFromZone = Number(((min - currentPrice) * multiplier).toFixed(1));
  return {
    currentPrice,
    entryMin: min,
    entryMax: max,
    multiplier,
    isInsideZone: false,
    pipsFromZone,
    directionToZone: "BELOW",
  };
}
```

#### Why this was written this way:
- **Strict Null Safety (`quote.price === null`):** Forex Pulse's `PriceQuote` model uses `price: number | null` to represent offline or unverified market data. Early-returning `null` guarantees that calculations only execute on valid numbers without runtime `NaN` or TypeScript compiler errors.
- **Universal Multiplier Normalization:** Handles 5-decimal pairs (`multiplier = 10,000`), 3-decimal pairs like USDJPY (`multiplier = 100`), and Gold XAUUSD (`multiplier = 10`) consistently.
- **Direction-Aware Math:** Correctly mirrors long vs short calculations so profit and drawdown are strictly standardized.
- **Capital Protection Triggers:** Evaluates when profit crosses the institutional `+1.0R` threshold where systematic traders lock risk at breakeven.

---

### 2. Create Active Trade Progress Gauge Component (`components/setups/ActiveTradeProgressGauge.tsx`)
This client component renders the visual gauge bar, real-time pips-to-target countdown, and one-click Breakeven protection prompt.

**File:** `components/setups/ActiveTradeProgressGauge.tsx`
```tsx
"use client";

import { useTransition } from "react";
import { ShieldCheck, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import type { TradingSetup } from "@/types/setup";
import type { PriceQuote } from "@/types/market";
import { formatPrice } from "@/lib/formatters";
import {
  calculateActiveTradeMetrics,
  calculatePendingTradeProximity,
} from "@/lib/tradeProgressUtils";
import { setSetupToBreakeven } from "@/app/actions/setupActions";
import { cn } from "@/lib/utils";

interface ActiveTradeProgressGaugeProps {
  setup: TradingSetup;
  quote?: PriceQuote | null;
}

export function ActiveTradeProgressGauge({ setup, quote }: ActiveTradeProgressGaugeProps) {
  const [isPending, startTransition] = useTransition();

  if (!quote || quote.price === null) return null;

  const isTriggered = setup.status === "ENTRY_TRIGGERED";
  const isPendingConfirmation = setup.status === "WAITING_FOR_CONFIRMATION";

  // Pending setup proximity display
  if (isPendingConfirmation) {
    const proximity = calculatePendingTradeProximity(setup, quote);
    if (!proximity) return null;

    return (
      <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-2.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">Entry Proximity</span>
          <span className="font-mono text-[11px] tabular-nums font-semibold">
            Mark: {formatPrice(proximity.currentPrice, proximity.multiplier === 10 ? 2 : proximity.multiplier === 100 ? 3 : 5)}
          </span>
        </div>

        <div className="mt-1.5 flex items-center justify-between">
          {proximity.isInsideZone ? (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-500">
              <Sparkles className="h-3 w-3" /> Inside Entry Zone (Ready)
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              {proximity.pipsFromZone} pips {proximity.directionToZone.toLowerCase()} entry zone
            </span>
          )}

          <span className="text-[10px] text-muted-foreground font-mono">
            Zone: {formatPrice(proximity.entryMin, proximity.multiplier === 10 ? 2 : proximity.multiplier === 100 ? 3 : 5)} - {formatPrice(proximity.entryMax, proximity.multiplier === 10 ? 2 : proximity.multiplier === 100 ? 3 : 5)}
          </span>
        </div>
      </div>
    );
  }

  // Active triggered trade gauge
  if (!isTriggered) return null;

  const metrics = calculateActiveTradeMetrics(setup, quote);
  if (!metrics) return null;

  const handleQuickBreakeven = () => {
    startTransition(async () => {
      const res = await setSetupToBreakeven(setup.id);
      if (!res.success) {
        alert(`Failed to set Breakeven: ${res.error}`);
      }
    });
  };

  // Convert -100% to +100% progress to 0% - 100% gauge position
  // 0% on gauge = Stop Loss, 50% = Entry Midpoint, 100% = Take Profit 1
  let gaugePosition = 50;
  if (metrics.progressPercent >= 0) {
    gaugePosition = 50 + (metrics.progressPercent / 100) * 50;
  } else {
    gaugePosition = 50 + (metrics.progressPercent / 100) * 50;
  }
  gaugePosition = Math.max(2, Math.min(98, gaugePosition));

  return (
    <div className="mt-3.5 space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3">
      {/* Top Status & Live Mark Row */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-semibold">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] font-bold",
              metrics.floatingR >= 0
                ? "bg-emerald-500/15 text-emerald-500"
                : "bg-rose-500/15 text-rose-500"
            )}
          >
            {metrics.floatingR >= 0 ? `+${metrics.floatingR}R` : `${metrics.floatingR}R`}
          </span>
          <span className="text-[11px] text-muted-foreground font-normal">
            ({metrics.pnlPips >= 0 ? `+${metrics.pnlPips}` : metrics.pnlPips} pips)
          </span>
        </div>

        <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
          <span>Mark:</span>
          <span className="font-semibold text-foreground tabular-nums">
            {formatPrice(metrics.currentPrice, metrics.decimals)}
          </span>
        </div>
      </div>

      {/* Progress Track Gauge */}
      <div className="space-y-1">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted border border-border/40">
          {/* SL Zone (Red gradient) */}
          <div className="absolute inset-y-0 left-0 w-1/2 bg-rose-500/25" />
          {/* TP Zone (Green gradient) */}
          <div className="absolute inset-y-0 right-0 w-1/2 bg-emerald-500/25" />
          {/* Midpoint divider (Entry) */}
          <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-border" />

          {/* Current Position Marker */}
          <div
            className={cn(
              "absolute top-0 bottom-0 w-2.5 -translate-x-1/2 rounded-full shadow-sm transition-all duration-300",
              metrics.floatingR >= 0 ? "bg-emerald-500 ring-2 ring-emerald-500/30" : "bg-rose-500 ring-2 ring-rose-500/30"
            )}
            style={{ left: `${gaugePosition}%` }}
          />
        </div>

        {/* Labels below gauge */}
        <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
          <span className="text-rose-500 font-medium">SL ({metrics.pipsToStop}p)</span>
          <span className="text-muted-foreground">Entry</span>
          <span className="text-emerald-500 font-medium">TP1 ({metrics.pipsToTarget}p)</span>
        </div>
      </div>

      {/* Breakeven Capital Protection Advisory Banner */}
      {metrics.isBreakevenEligible && (
        <div className="flex items-center justify-between rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-xs text-sky-500">
          <div className="flex items-center gap-1.5 min-w-0">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[11px] font-medium truncate">
              +1.0R reached. Secure capital at Breakeven.
            </span>
          </div>

          <button
            type="button"
            disabled={isPending}
            onClick={handleQuickBreakeven}
            className="ml-2 inline-flex items-center gap-1 shrink-0 rounded bg-sky-500 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-sky-600 transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Set BE"}
          </button>
        </div>
      )}

      {/* Warning Alert if Stop Imminent */}
      {metrics.protectionStatus === "STOP_IMMINENT" && (
        <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-medium text-rose-500">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Risk Warning: Market within {metrics.pipsToStop} pips of Stop Loss.</span>
        </div>
      )}
    </div>
  );
}
```

---

### 3. Upgrade Setup Card (`components/setups/SetupCard.tsx`)
Embed the `ActiveTradeProgressGauge` in `SetupCard.tsx`, accepting the optional `quote` prop.

**File:** `components/setups/SetupCard.tsx`
```tsx
"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, Clock, XCircle, AlertCircle, Activity, type LucideIcon } from "lucide-react";
import type { SetupStatus, TradingSetup } from "@/types/setup";
import type { PriceQuote } from "@/types/market";
import { INSTRUMENTS } from "@/lib/constants/instruments";
import { formatPrice } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { SetupStatusActions } from "@/components/setups/SetupStatusActions";
import { EditSetupModal } from "@/components/setups/EditSetupModal";
import { ActiveTradeProgressGauge } from "@/components/setups/ActiveTradeProgressGauge";

const STATUS_CONFIG: Record<SetupStatus, { label: string; icon: LucideIcon; color: string }> = {
  WAITING_FOR_CONFIRMATION: { label: "Waiting", icon: Clock, color: "text-amber-500 bg-amber-500/10" },
  ENTRY_TRIGGERED: { label: "Active", icon: Activity, color: "text-sky-500 bg-sky-500/10" },
  TP_REACHED: { label: "Won", icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10" },
  SL_HIT: { label: "Lost", icon: XCircle, color: "text-rose-500 bg-rose-500/10" },
  INVALIDATED: { label: "Invalidated", icon: AlertCircle, color: "text-slate-500 bg-slate-500/10" },
  EXPIRED: { label: "Expired", icon: Clock, color: "text-slate-500 bg-slate-500/10" },
};

export function SetupCard({ setup, quote }: { setup: TradingSetup; quote?: PriceQuote | null }) {
  const isLong = setup.direction === "LONG";
  const instrument = INSTRUMENTS.find((i) => i.symbol === setup.symbol);
  const decimals = instrument?.decimals ?? 5;
  const status = STATUS_CONFIG[setup.status];
  const StatusIcon = status.icon;

  return (
    <motion.article
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md",
              isLong ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
            )}>
              {isLong ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            </span>
            <h3 className="font-semibold">{setup.symbol}</h3>
            {/* Quick Edit Modal */}
            <EditSetupModal setup={setup} />
          </div>
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", status.color)}>
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </span>
        </div>

        {/* Price Levels */}
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Entry Zone</p>
            <p className="font-medium tabular-nums">{formatPrice(setup.entryMin, decimals)}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{formatPrice(setup.entryMax, decimals)}</p>
          </div>
          <div className="border-l border-border pl-2">
            <p className="text-xs text-muted-foreground">Stop Loss</p>
            <p className="font-medium tabular-nums text-rose-500">{formatPrice(setup.stopLoss, decimals)}</p>
          </div>
          <div className="border-l border-border pl-2">
            <p className="text-xs text-muted-foreground">Take Profit 1</p>
            <p className="font-medium tabular-nums text-emerald-500">{formatPrice(setup.takeProfit1, decimals)}</p>
          </div>
        </div>

        {/* Real-time Progress Gauge & Capital Protection Radar */}
        <ActiveTradeProgressGauge setup={setup} quote={quote} />

        {/* Confluence Tags */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {setup.confluenceTags.map((tag) => (
            <span key={tag} className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Footer & Interactive Transitions */}
      <div className="mt-4 flex flex-col gap-2.5 border-t border-border pt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={setup.invalidationRule}>
            Invalidation: {setup.invalidationRule}
          </span>
          <span className="rounded bg-muted px-2 py-1 text-xs font-semibold">
            R:R 1:{setup.riskReward.toFixed(1)}
          </span>
        </div>

        {/* Action Buttons for Pending or Active Setups */}
        <div className="flex justify-end">
          <SetupStatusActions setupId={setup.id} currentStatus={setup.status} />
        </div>
      </div>
    </motion.article>
  );
}
```

---

### 4. Upgrade Setup Grid (`components/setups/SetupGrid.tsx`)
Map live market quotes by symbol and pass each instrument's live quote to its respective `SetupCard`.

**File:** `components/setups/SetupGrid.tsx`
```tsx
"use client";

import { useMemo } from "react";
import { Target } from "lucide-react";
import type { TradingSetup } from "@/types/setup";
import type { PriceQuote } from "@/types/market";
import { SetupCard } from "@/components/setups/SetupCard";

interface SetupGridProps {
  setups: TradingSetup[];
  quotes?: PriceQuote[];
}

export function SetupGrid({ setups, quotes = [] }: SetupGridProps) {
  const quoteMap = useMemo(() => {
    return new Map(quotes.map((q) => [q.symbol, q]));
  }, [quotes]);

  if (setups.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
        <Target className="mb-4 h-10 w-10 opacity-20" />
        <p>No trading setups found.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {setups.map((setup) => (
        <SetupCard
          key={setup.id}
          setup={setup}
          quote={quoteMap.get(setup.symbol)}
        />
      ))}
    </div>
  );
}
```

---

### 5. Upgrade Setups Page Controller (`app/(dashboard)/setups/page.tsx`)
Fetch quotes in parallel with setups and feed both to the grid.

**File:** `app/(dashboard)/setups/page.tsx`
```tsx
import { getActiveSetups } from "@/lib/services/setups";
import { getQuotes } from "@/lib/services/marketData";
import { SetupGrid } from "@/components/setups/SetupGrid";
import { CreateSetupModal } from "@/components/setups/CreateSetupModal";
import { SetupRealtimeListener } from "@/components/setups/SetupRealtimeListener";

export default async function SetupsPage() {
  const [setups, quotes] = await Promise.all([
    getActiveSetups(),
    getQuotes(),
  ]);

  return (
    <div className="space-y-6">
      {/* Realtime WebSocket subscription */}
      <SetupRealtimeListener />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Active Setups</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Trades waiting for entry confirmation or currently active in the market.
          </p>
        </div>
        <CreateSetupModal />
      </div>

      <SetupGrid setups={setups} quotes={quotes} />
    </div>
  );
}
```

---

## 🧪 Verification & Testing
1. Navigate to **`/setups`**.
2. Examine **Pending Setups** (`WAITING_FOR_CONFIRMATION`):
   - Notice the **Entry Proximity radar** calculating exact pips between the current market mark and the entry zone boundaries.
3. Examine or trigger an **Active Setup** (`ENTRY_TRIGGERED`):
   - Notice the multi-zone progress track: SL (Red) to Midpoint (Entry) to TP1 (Green).
   - Observe the live mark price, floating pips, and floating R-multiple badges (e.g. `+1.4R` / `+28.5 pips`).
   - If profit reaches or exceeds `+1.0R`, verify the **Capital Protection Advisory** banner appears with the one-click **"Set BE"** action button.
4. Run `npx tsc --noEmit` to verify 0 type errors.
