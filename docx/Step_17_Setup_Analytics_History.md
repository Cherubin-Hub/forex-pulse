# Step 17: Setup History & Win-Rate Performance Analytics

## 🎯 Overview
In this step, we build the quantitative post-trade analytics engine. By analyzing closed trades (`TP_REACHED`, `SL_HIT`, `INVALIDATED`, `EXPIRED`), we calculate performance metrics: Win Rate percentage, Net Realized R-Multiple return, Average Risk:Reward, and Profit Factor.

---

### 1. Analytics Calculation Engine (`lib/analyticsUtils.ts`)

Executes post-trade mathematical evaluations on arrays of trade setups.

**File:** `lib/analyticsUtils.ts`
```typescript
import type { TradingSetup } from "@/types/setup";

export interface SetupAnalytics {
  totalTrades: number;
  completedTrades: number;
  wins: number;
  losses: number;
  invalidated: number;
  winRate: number; // percentage (0 - 100)
  avgRiskReward: number;
  netR: number; // Sum of R-multiples: +R for TP_REACHED, -1R for SL_HIT
  profitFactor: number;
}

/**
 * Calculates quantitative performance metrics from an array of trading setups.
 */
export function calculateSetupAnalytics(setups: TradingSetup[]): SetupAnalytics {
  const totalTrades = setups.length;
  
  const wins = setups.filter((s) => s.status === "TP_REACHED").length;
  const losses = setups.filter((s) => s.status === "SL_HIT").length;
  const invalidated = setups.filter((s) => s.status === "INVALIDATED" || s.status === "EXPIRED").length;
  
  const completedTrades = wins + losses;
  const winRate = completedTrades > 0 ? (wins / completedTrades) * 100 : 0;

  // Average R:R across all logged setups
  const totalRR = setups.reduce((acc, s) => acc + s.riskReward, 0);
  const avgRiskReward = totalTrades > 0 ? totalRR / totalTrades : 0;

  // Net R calculation:
  // Win gains = setup.riskReward (R)
  // Loss = -1.0 R
  const grossProfitR = setups
    .filter((s) => s.status === "TP_REACHED")
    .reduce((acc, s) => acc + s.riskReward, 0);

  const grossLossR = losses * 1.0; // 1R per loss
  const netR = grossProfitR - grossLossR;

  // Profit Factor = Gross Profit R / Gross Loss R
  const profitFactor = grossLossR > 0 
    ? grossProfitR / grossLossR 
    : grossProfitR > 0 ? grossProfitR : 0;

  return {
    totalTrades,
    completedTrades,
    wins,
    losses,
    invalidated,
    winRate: Number(winRate.toFixed(1)),
    avgRiskReward: Number(avgRiskReward.toFixed(2)),
    netR: Number(netR.toFixed(1)),
    profitFactor: Number(profitFactor.toFixed(2)),
  };
}
```

#### Why this was written this way:
- **Net R-Multiple Metric:** Looking only at Win Rate is deceptive; a trader can have a 40% win rate and be exceptionally profitable if their winners average 3R. Tracking Net R (`grossProfitR - grossLossR`) measures real portfolio edge.
- **Completed Trades Base:** Win Rate is calculated only against trades that reached a definitive outcome (`TP_REACHED` vs `SL_HIT`), excluding setups that were invalidated before entry.

---

### 2. Analytics Summary KPI Grid (`components/setups/SetupAnalyticsSummary.tsx`)

Visual KPI header displaying the 4 core metrics with Framer Motion entry animations.

**File:** `components/setups/SetupAnalyticsSummary.tsx`
```tsx
"use client";

import { motion } from "framer-motion";
import { Trophy, TrendingUp, Percent, Hash } from "lucide-react";
import type { SetupAnalytics } from "@/lib/analyticsUtils";
import { cn } from "@/lib/utils";

export function SetupAnalyticsSummary({ analytics }: { analytics: SetupAnalytics }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Win Rate */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-xl border border-border bg-card p-4 shadow-sm"
      >
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium">Win Rate</span>
          <Percent className="h-4 w-4 text-emerald-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight">
            {analytics.winRate}%
          </span>
          <span className="text-xs text-muted-foreground">
            ({analytics.wins}W - {analytics.losses}L)
          </span>
        </div>
      </motion.div>

      {/* Net R-Multiple */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.05 }}
        className="rounded-xl border border-border bg-card p-4 shadow-sm"
      >
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium">Net Return (R)</span>
          <TrendingUp className={cn("h-4 w-4", analytics.netR >= 0 ? "text-emerald-500" : "text-rose-500")} />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className={cn("text-2xl font-bold tracking-tight", analytics.netR >= 0 ? "text-emerald-500" : "text-rose-500")}>
            {analytics.netR > 0 ? `+${analytics.netR}R` : `${analytics.netR}R`}
          </span>
          <span className="text-xs text-muted-foreground">
            Profit Factor: {analytics.profitFactor}
          </span>
        </div>
      </motion.div>

      {/* Average Risk:Reward */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
        className="rounded-xl border border-border bg-card p-4 shadow-sm"
      >
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium">Avg Risk : Reward</span>
          <Trophy className="h-4 w-4 text-amber-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight">
            1:{analytics.avgRiskReward}
          </span>
          <span className="text-xs text-muted-foreground">Plan Average</span>
        </div>
      </motion.div>

      {/* Total Setups Logged */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.15 }}
        className="rounded-xl border border-border bg-card p-4 shadow-sm"
      >
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium">Total Logged</span>
          <Hash className="h-4 w-4 text-sky-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight">
            {analytics.totalTrades}
          </span>
          <span className="text-xs text-muted-foreground">
            {analytics.invalidated} Invalidated
          </span>
        </div>
      </motion.div>
    </div>
  );
}
```

---

### 3. Setup History View Page (`app/(dashboard)/setups/history/page.tsx`)

Renders closed trade records alongside the performance KPIs.

**File:** `app/(dashboard)/setups/history/page.tsx`
```tsx
import { getHistorySetups } from "@/lib/services/setups";
import { calculateSetupAnalytics } from "@/lib/analyticsUtils";
import { SetupAnalyticsSummary } from "@/components/setups/SetupAnalyticsSummary";
import { SetupGrid } from "@/components/setups/SetupGrid";

export default async function SetupHistoryPage() {
  const historySetups = await getHistorySetups();
  const analytics = calculateSetupAnalytics(historySetups);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Setup History & Analytics</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Review closed trades, win rate performance, and net R-multiple returns.
        </p>
      </div>

      <SetupAnalyticsSummary analytics={analytics} />

      <div className="pt-4 border-t border-border">
        <h3 className="text-base font-semibold mb-4">Historical Trade Journal</h3>
        <SetupGrid setups={historySetups} />
      </div>
    </div>
  );
}
```

#### Why this was written this way:
- **Server-Side Aggregation:** Calculations execute on the server during initial load, ensuring that historical trade data is indexed and rendered with zero client calculation latency.
