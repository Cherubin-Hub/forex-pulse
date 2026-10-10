# Step 15: Setup Cards & Responsive Grid

## 🎯 Objective
Design and build the visual representation layer for trading setups. Active setups are organized within a responsive CSS grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`). Each card features directional arrows, lifecycle status badges with Lucide icons, a 3-column price matrix (Entry Zone, Stop Loss, Take Profit 1) formatted according to instrument decimal precision, confluence tag chips, invalidation rules, computed Risk:Reward ratios, and embedded state-machine transition buttons.

---

## 🛠 Step-by-Step Implementation

### 1. Define Mock Active & Historical Trading Setups (`lib/mock/setups.ts`)
Provide mock setups covering pending confirmation, active execution, won (TP), lost (SL), and invalidated states.

**File:** `lib/mock/setups.ts`
```typescript
import type { TradingSetup } from "@/types/setup";
import { calculateRiskReward } from "@/lib/setupUtils";

function createMockSetup(
  id: string, symbol: string, direction: "LONG" | "SHORT",
  entryMin: number, entryMax: number, stopLoss: number, tp1: number,
  status: TradingSetup["status"], confluenceTags: string[]
): TradingSetup {
  const entryAvg = (entryMin + entryMax) / 2;
  
  return {
    id, symbol, direction,
    entryMin, entryMax, stopLoss,
    takeProfit1: tp1, takeProfit2: null,
    riskReward: calculateRiskReward(direction, entryAvg, stopLoss, tp1),
    status,
    invalidationRule: direction === "LONG" ? `H1 close below ${stopLoss}` : `H1 close above ${stopLoss}`,
    notes: "Awaiting New York overlap volume.",
    confluenceTags,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const MOCK_ACTIVE_SETUPS: TradingSetup[] = [
  createMockSetup("setup-1", "EURUSD", "SHORT", 1.1260, 1.1270, 1.1290, 1.1215, "WAITING_FOR_CONFIRMATION", ["Liquidity Sweep", "Bearish BOS"]),
  createMockSetup("setup-2", "GBPUSD", "LONG", 1.3150, 1.3160, 1.3130, 1.3220, "ENTRY_TRIGGERED", ["Order Block", "Asian High Sweep"]),
];

export const MOCK_HISTORY_SETUPS: TradingSetup[] = [
  createMockSetup("setup-3", "USDJPY", "LONG", 148.50, 148.60, 148.20, 149.50, "TP_REACHED", ["Fib 61.8", "Bullish CHoCH"]),
  createMockSetup("setup-4", "AUDUSD", "SHORT", 0.6650, 0.6655, 0.6670, 0.6610, "SL_HIT", ["Resistance Reject"]),
  createMockSetup("setup-5", "XAUUSD", "LONG", 2630, 2635, 2620, 2660, "INVALIDATED", ["Trendline Break"]),
];
```

#### Why this was written this way:
- **Factory Helper (`createMockSetup`):** Automates the calculation of midpoint entry, automated R:R ratio via `calculateRiskReward`, and ISO timestamps, ensuring consistency across test datasets.
- **Partitioned Mock Stores:** `MOCK_ACTIVE_SETUPS` stores trades in progress (`WAITING_FOR_CONFIRMATION` and `ENTRY_TRIGGERED`), while `MOCK_HISTORY_SETUPS` stores resolved trades (`TP_REACHED`, `SL_HIT`, `INVALIDATED`), reflecting real database query filtering.

---

### 2. Create Trading Setup Card Component (`components/setups/SetupCard.tsx`)
Create the visual card component that displays all setup metadata, price levels, and transition controls with Framer Motion entry animations.

**File:** `components/setups/SetupCard.tsx`
```tsx
"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, Clock, XCircle, AlertCircle, Activity, type LucideIcon } from "lucide-react";
import type { SetupStatus, TradingSetup } from "@/types/setup";
import { INSTRUMENTS } from "@/lib/constants/instruments";
import { formatPrice } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { SetupStatusActions } from "@/components/setups/SetupStatusActions";

const STATUS_CONFIG: Record<SetupStatus, { label: string; icon: LucideIcon; color: string }> = {
  WAITING_FOR_CONFIRMATION: { label: "Waiting", icon: Clock, color: "text-amber-500 bg-amber-500/10" },
  ENTRY_TRIGGERED: { label: "Active", icon: Activity, color: "text-sky-500 bg-sky-500/10" },
  TP_REACHED: { label: "Won", icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10" },
  SL_HIT: { label: "Lost", icon: XCircle, color: "text-rose-500 bg-rose-500/10" },
  INVALIDATED: { label: "Invalidated", icon: AlertCircle, color: "text-slate-500 bg-slate-500/10" },
  EXPIRED: { label: "Expired", icon: Clock, color: "text-slate-500 bg-slate-500/10" },
};

export function SetupCard({ setup }: { setup: TradingSetup }) {
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
          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
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

#### Why this was written this way:
- **`STATUS_CONFIG` Dictionary:** Decouples status visuals (badge color, icon, label) from JSX markup, making theme or status updates centralized and effortless.
- **Instrument Precision Awareness:** Looks up the instrument's designated decimal places via `INSTRUMENTS.find()` (e.g. 2 for Gold, 3 for JPY, 5 for Majors), ensuring that `formatPrice()` formats rates cleanly.
- **3-Column Price Block:** Compact, high-contrast visual display of Entry Zone, Stop Loss (rose/red), and Take Profit (emerald/green) with `tabular-nums` alignment to prevent number jitter.
- **Confluence Tag Badges:** Displays technical setup reasons (e.g., "Liquidity Sweep", "Fib 61.8") as compact badges to reinforce disciplined trading execution.
- **Integrated Transition Actions:** Embeds `<SetupStatusActions />` directly into the card footer, enabling one-click state machine execution.

---

### 3. Create Responsive Setup Grid Container (`components/setups/SetupGrid.tsx`)
Create the container component that organizes cards into a responsive multi-column grid and displays an empty state when no setups are present.

**File:** `components/setups/SetupGrid.tsx`
```tsx
"use client";

import { Target } from "lucide-react";
import type { TradingSetup } from "@/types/setup";
import { SetupCard } from "@/components/setups/SetupCard";

export function SetupGrid({ setups }: { setups: TradingSetup[] }) {
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
        <SetupCard key={setup.id} setup={setup} />
      ))}
    </div>
  );
}
```

#### Why this was written this way:
- **Responsive Breakpoint Layout:** Automatically switches between 1 column (mobile screens), 2 columns (`md:grid-cols-2` tablets), and 3 columns (`lg:grid-cols-3` desktop monitors).
- **Graceful Empty State:** Avoids blank screens by rendering a dashed card with a subtle `Target` icon when no active setups exist.

---

### 4. Create Active Setups Dashboard Route (`app/(dashboard)/setups/page.tsx`)
Create the server page that queries active setups, listens for Realtime WebSocket updates, and renders the header action modal.

**File:** `app/(dashboard)/setups/page.tsx`
```tsx
import { getActiveSetups } from "@/lib/services/setups";
import { SetupGrid } from "@/components/setups/SetupGrid";
import { CreateSetupModal } from "@/components/setups/CreateSetupModal";
import { SetupRealtimeListener } from "@/components/setups/SetupRealtimeListener";

export default async function SetupsPage() {
  const setups = await getActiveSetups();

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

      <SetupGrid setups={setups} />
    </div>
  );
}
```

#### Why this was written this way:
- **Server Component Rendering:** Server fetches active setups via `getActiveSetups()` on initial page load, delivering complete markup to the browser immediately.
- **WebSocket Synchronization:** Houses `<SetupRealtimeListener />` at the top level to trigger background revalidations whenever changes occur in PostgreSQL.
- **Action Header:** Positions `<CreateSetupModal />` conveniently in the top-right header for quick trade logging.

---

## 🧪 Verification & Testing
1. Navigate to `http://localhost:3000/setups`.
2. Verify that active setups render inside cards with correct color-coded direction icons (green up-arrow for LONG, red down-arrow for SHORT).
3. Confirm that prices display with accurate decimal precision (e.g. 5 decimals for EURUSD and GBPUSD).
4. Resize the browser viewport from mobile (375px) to tablet (768px) and desktop (1280px) and confirm that the grid rearranges smoothly across 1, 2, and 3 columns.
