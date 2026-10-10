# Step 37: Confluence Tag Performance Matrix & Playbook Edge Analytics

## 🎯 Objective
Empower traders to identify their mathematical edge on the Setup History Hub (`/setups/history`). This step delivers:
1. **Confluence Tag Performance Engine (`lib/analyticsUtils.ts`):** Calculates isolated win rates, net R-multiple returns, profit factors, and trade expectancies across every confluence tag (e.g., "Liquidity Sweep", "Order Block", "Asian High Sweep", "Fib 61.8").
2. **Directional & Instrument Edge Breakdown:** Computes segregated performance statistics comparing Long vs Short trades, as well as pair-by-pair win rates (e.g., `XAUUSD` vs `EURUSD`).
3. **Interactive Confluence Edge Matrix Widget (`components/setups/ConfluenceTagMatrix.tsx`):** Renders a sortable playbook matrix with "Edge Confirmed" status badges, win-rate meters, and one-click filtering to isolate past setups sharing any specific tag.
4. **Unified Setup History Experience (`components/setups/SetupHistoryView.tsx`):** Integrates the matrix with the existing Cumulative R equity curve, CSV export, and trade cards grid.

---

## 🛠 Step-by-Step Implementation

### 1. Expand Analytics Math Utilities (`lib/analyticsUtils.ts`)
Add analytical functions to aggregate performance by confluence tags, trade directions, and currency symbols.

**File:** `lib/analyticsUtils.ts`
```typescript
import type { TradingSetup, TradeDirection } from "@/types/setup";

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

export interface TagPerformance {
  tag: string;
  totalTrades: number;
  completedTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  netR: number;
  expectancyR: number;
  profitFactor: number;
}

export interface DimensionPerformance {
  key: string;
  totalTrades: number;
  completedTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  netR: number;
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

  const totalRR = setups.reduce((acc, s) => acc + s.riskReward, 0);
  const avgRiskReward = totalTrades > 0 ? totalRR / totalTrades : 0;

  const grossProfitR = setups
    .filter((s) => s.status === "TP_REACHED")
    .reduce((acc, s) => acc + s.riskReward, 0);

  const grossLossR = losses * 1.0;
  const netR = grossProfitR - grossLossR;

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

/**
 * Aggregates performance statistics across individual confluence tags.
 */
export function calculateTagAnalytics(setups: TradingSetup[]): TagPerformance[] {
  const tagMap: Record<
    string,
    { total: number; wins: number; losses: number; grossProfitR: number; grossLossR: number }
  > = {};

  for (const s of setups) {
    for (const tag of s.confluenceTags) {
      if (!tagMap[tag]) {
        tagMap[tag] = { total: 0, wins: 0, losses: 0, grossProfitR: 0, grossLossR: 0 };
      }
      tagMap[tag].total += 1;

      if (s.status === "TP_REACHED") {
        tagMap[tag].wins += 1;
        tagMap[tag].grossProfitR += Number(s.riskReward);
      } else if (s.status === "SL_HIT") {
        tagMap[tag].losses += 1;
        tagMap[tag].grossLossR += 1.0;
      }
    }
  }

  return Object.entries(tagMap)
    .map(([tag, data]) => {
      const completed = data.wins + data.losses;
      const winRate = completed > 0 ? (data.wins / completed) * 100 : 0;
      const netR = data.grossProfitR - data.grossLossR;
      const expectancyR = completed > 0 ? netR / completed : 0;
      const profitFactor = data.grossLossR > 0
        ? data.grossProfitR / data.grossLossR
        : data.grossProfitR > 0 ? data.grossProfitR : 0;

      return {
        tag,
        totalTrades: data.total,
        completedTrades: completed,
        wins: data.wins,
        losses: data.losses,
        winRate: Number(winRate.toFixed(1)),
        netR: Number(netR.toFixed(1)),
        expectancyR: Number(expectancyR.toFixed(2)),
        profitFactor: Number(profitFactor.toFixed(2)),
      };
    })
    .sort((a, b) => b.netR - a.netR);
}

/**
 * Aggregates performance statistics by trade direction (LONG vs SHORT) or by currency pair.
 */
export function calculateDimensionAnalytics(
  setups: TradingSetup[],
  dimension: "DIRECTION" | "SYMBOL"
): DimensionPerformance[] {
  const groups: Record<string, { total: number; wins: number; losses: number; grossProfitR: number; grossLossR: number }> = {};

  for (const s of setups) {
    const key = dimension === "DIRECTION" ? s.direction : s.symbol;
    if (!groups[key]) {
      groups[key] = { total: 0, wins: 0, losses: 0, grossProfitR: 0, grossLossR: 0 };
    }

    groups[key].total += 1;
    if (s.status === "TP_REACHED") {
      groups[key].wins += 1;
      groups[key].grossProfitR += Number(s.riskReward);
    } else if (s.status === "SL_HIT") {
      groups[key].losses += 1;
      groups[key].grossLossR += 1.0;
    }
  }

  return Object.entries(groups)
    .map(([key, data]) => {
      const completed = data.wins + data.losses;
      const winRate = completed > 0 ? (data.wins / completed) * 100 : 0;
      const netR = data.grossProfitR - data.grossLossR;

      return {
        key,
        totalTrades: data.total,
        completedTrades: completed,
        wins: data.wins,
        losses: data.losses,
        winRate: Number(winRate.toFixed(1)),
        netR: Number(netR.toFixed(1)),
      };
    })
    .sort((a, b) => b.netR - a.netR);
}
```

#### Why this was written this way:
- **Expectancy per Trade:** Computes $\text{Expectancy } (R) = \frac{\text{Net } R}{\text{Completed Trades}}$, identifying the true statistical return expected on every future execution of that setup tag.
- **Dimensional Modularity:** `calculateDimensionAnalytics` enables flexible aggregation across trade direction (`LONG` vs `SHORT`) and currency symbols (`EURUSD`, `XAUUSD`, etc.) with identical math logic.

---

### 2. Create Confluence Tag Matrix Widget (`components/setups/ConfluenceTagMatrix.tsx`)
Create a playbook matrix displaying performance breakdowns and click-to-filter tags.

**File:** `components/setups/ConfluenceTagMatrix.tsx`
```tsx
"use client";

import { useState, useMemo } from "react";
import { Award, Target, Tag, ArrowUpDown } from "lucide-react";
import type { TradingSetup } from "@/types/setup";
import { calculateTagAnalytics, calculateDimensionAnalytics } from "@/lib/analyticsUtils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfluenceTagMatrixProps {
  setups: TradingSetup[];
  onSelectTag: (tag: string) => void;
  activeTag: string;
}

type MatrixTab = "TAGS" | "DIRECTION" | "PAIRS";

export function ConfluenceTagMatrix({ setups, onSelectTag, activeTag }: ConfluenceTagMatrixProps) {
  const [tab, setTab] = useState<MatrixTab>("TAGS");

  const tagData = useMemo(() => calculateTagAnalytics(setups), [setups]);
  const directionData = useMemo(() => calculateDimensionAnalytics(setups, "DIRECTION"), [setups]);
  const pairData = useMemo(() => calculateDimensionAnalytics(setups, "SYMBOL"), [setups]);

  if (setups.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Playbook Edge & Confluence Matrix
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Statistical edge, win rates, and R-expectancy across your execution playbook.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
          <Button
            variant={tab === "TAGS" ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2.5 text-xs font-semibold"
            onClick={() => setTab("TAGS")}
          >
            Confluences
          </Button>
          <Button
            variant={tab === "DIRECTION" ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2.5 text-xs font-semibold"
            onClick={() => setTab("DIRECTION")}
          >
            Direction
          </Button>
          <Button
            variant={tab === "PAIRS" ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2.5 text-xs font-semibold"
            onClick={() => setTab("PAIRS")}
          >
            Pairs
          </Button>
        </div>
      </div>

      {/* View: Confluence Tags Table */}
      {tab === "TAGS" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-border text-[11px] text-muted-foreground">
                <th className="pb-2 font-medium">Confluence Tag</th>
                <th className="pb-2 font-medium text-center">Record</th>
                <th className="pb-2 font-medium text-center">Win Rate</th>
                <th className="pb-2 font-medium text-center">Net R</th>
                <th className="pb-2 font-medium text-center">Expectancy</th>
                <th className="pb-2 font-medium text-right">Edge Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {tagData.map((row) => {
                const isSelected = activeTag.toLowerCase() === row.tag.toLowerCase();
                const isConfirmed = row.winRate >= 55 && row.netR > 0;

                return (
                  <tr
                    key={row.tag}
                    onClick={() => onSelectTag(isSelected ? "" : row.tag)}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-muted/30",
                      isSelected && "bg-primary/10"
                    )}
                  >
                    <td className="py-2.5 font-semibold flex items-center gap-1.5">
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      <span>{row.tag}</span>
                      {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </td>
                    <td className="py-2.5 text-center font-mono text-muted-foreground">
                      {row.wins}W - {row.losses}L
                    </td>
                    <td className="py-2.5 text-center font-mono font-bold">
                      <span className={row.winRate >= 50 ? "text-emerald-500" : "text-rose-500"}>
                        {row.winRate}%
                      </span>
                    </td>
                    <td className="py-2.5 text-center font-mono font-bold">
                      <span className={row.netR >= 0 ? "text-emerald-500" : "text-rose-500"}>
                        {row.netR > 0 ? `+${row.netR}R` : `${row.netR}R`}
                      </span>
                    </td>
                    <td className="py-2.5 text-center font-mono">
                      {row.expectancyR > 0 ? `+${row.expectancyR}R` : `${row.expectancyR}R`}
                    </td>
                    <td className="py-2.5 text-right">
                      {isConfirmed ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500 border border-emerald-500/20">
                          <Award className="h-3 w-3" />
                          Edge Confirmed
                        </span>
                      ) : (
                        <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Gathering Data
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* View: Directional Long vs Short */}
      {tab === "DIRECTION" && (
        <div className="grid grid-cols-2 gap-3">
          {directionData.map((d) => (
            <div
              key={d.key}
              className={cn(
                "rounded-lg border p-3 text-xs space-y-2",
                d.key === "LONG" ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/20 bg-rose-500/5"
              )}
            >
              <div className="flex items-center justify-between font-bold">
                <span className={d.key === "LONG" ? "text-emerald-500" : "text-rose-500"}>
                  {d.key} Trades
                </span>
                <span className="font-mono text-xs">{d.wins}W - {d.losses}L</span>
              </div>
              <div className="flex items-baseline justify-between font-mono">
                <span className="text-muted-foreground">Win Rate:</span>
                <span className="font-bold">{d.winRate}%</span>
              </div>
              <div className="flex items-baseline justify-between font-mono border-t border-border/40 pt-1.5">
                <span className="text-muted-foreground">Net Return:</span>
                <span className={cn("font-bold", d.netR >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  {d.netR > 0 ? `+${d.netR}R` : `${d.netR}R`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View: Pair Performance */}
      {tab === "PAIRS" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {pairData.map((p) => (
            <div key={p.key} className="rounded-lg border border-border bg-muted/20 p-2.5 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span>{p.key}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{p.totalTrades} trades</span>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-muted-foreground">Win:</span>
                <span className={p.winRate >= 50 ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
                  {p.winRate}%
                </span>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-muted-foreground">Net R:</span>
                <span className={cn("font-bold", p.netR >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  {p.netR > 0 ? `+${p.netR}R` : `${p.netR}R`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

### 3. Upgrade Setup History View (`components/setups/SetupHistoryView.tsx`)
Connect `ConfluenceTagMatrix` to the setup search filter so clicking any tag immediately filters the trades.

**File:** `components/setups/SetupHistoryView.tsx`
```tsx
"use client";

import { useState, useMemo } from "react";
import { Download, Search } from "lucide-react";
import type { TradingSetup } from "@/types/setup";
import { calculateSetupAnalytics } from "@/lib/analyticsUtils";
import { exportSetupsToCSV } from "@/lib/exportUtils";
import { SetupAnalyticsSummary } from "@/components/setups/SetupAnalyticsSummary";
import { CumulativeRChart } from "@/components/setups/CumulativeRChart";
import { ConfluenceTagMatrix } from "@/components/setups/ConfluenceTagMatrix";
import { SetupGrid } from "@/components/setups/SetupGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FilterStatus = "ALL" | "TP_REACHED" | "SL_HIT" | "INVALIDATED";

export function SetupHistoryView({ initialSetups }: { initialSetups: TradingSetup[] }) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");
  const [selectedDirection, setSelectedDirection] = useState<"ALL" | "LONG" | "SHORT">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Filtered setups based on active status, direction, and keyword search
  const filteredSetups = useMemo(() => {
    return initialSetups.filter((setup) => {
      const matchesStatus =
        filterStatus === "ALL" ? true : setup.status === filterStatus;
      const matchesDirection =
        selectedDirection === "ALL" ? true : setup.direction === selectedDirection;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        setup.symbol.toLowerCase().includes(q) ||
        setup.notes.toLowerCase().includes(q) ||
        setup.confluenceTags.some((tag) => tag.toLowerCase().includes(q));

      return matchesStatus && matchesDirection && matchesSearch;
    });
  }, [initialSetups, filterStatus, selectedDirection, searchQuery]);

  // Analytics calculated across all historical setups
  const analytics = useMemo(() => {
    return calculateSetupAnalytics(initialSetups);
  }, [initialSetups]);

  return (
    <div className="space-y-6">
      {/* Performance Summary Metrics */}
      <SetupAnalyticsSummary analytics={analytics} />

      {/* Cumulative R-Multiple Performance Curve */}
      <CumulativeRChart setups={initialSetups} />

      {/* Playbook Edge & Confluence Matrix */}
      <ConfluenceTagMatrix
        setups={initialSetups}
        activeTag={searchQuery}
        onSelectTag={(tag) => setSearchQuery(tag)}
      />

      {/* Filter & Export Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Status Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant={filterStatus === "ALL" ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs font-semibold"
              onClick={() => setFilterStatus("ALL")}
            >
              All Outcomes ({initialSetups.length})
            </Button>
            <Button
              variant={filterStatus === "TP_REACHED" ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs font-semibold text-emerald-500"
              onClick={() => setFilterStatus("TP_REACHED")}
            >
              Won (TP)
            </Button>
            <Button
              variant={filterStatus === "SL_HIT" ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs font-semibold text-rose-500"
              onClick={() => setFilterStatus("SL_HIT")}
            >
              Lost (SL)
            </Button>
            <Button
              variant={filterStatus === "INVALIDATED" ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs font-semibold text-muted-foreground"
              onClick={() => setFilterStatus("INVALIDATED")}
            >
              Invalidated
            </Button>
          </div>

          {/* Search & Export Actions */}
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search symbol/tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 shrink-0"
              onClick={() => exportSetupsToCSV(initialSetups)}
              title="Download Trade Journal as CSV"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Direction Toggle */}
        <div className="flex items-center gap-1 pt-2 border-t border-border/50">
          <span className="text-[11px] font-medium text-muted-foreground mr-1.5">Direction:</span>
          <Button
            variant={selectedDirection === "ALL" ? "secondary" : "ghost"}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setSelectedDirection("ALL")}
          >
            All
          </Button>
          <Button
            variant={selectedDirection === "LONG" ? "secondary" : "ghost"}
            size="sm"
            className="h-6 px-2 text-xs text-emerald-500 font-semibold"
            onClick={() => setSelectedDirection("LONG")}
          >
            Long
          </Button>
          <Button
            variant={selectedDirection === "SHORT" ? "secondary" : "ghost"}
            size="sm"
            className="h-6 px-2 text-xs text-rose-500 font-semibold"
            onClick={() => setSelectedDirection("SHORT")}
          >
            Short
          </Button>
        </div>
      </div>

      {/* Setup Cards Grid */}
      <SetupGrid setups={filteredSetups} />
    </div>
  );
}
```

---

## 🧪 Verification & Testing
1. Navigate to `http://localhost:3000/setups/history` via the sidebar.
2. Confirm the **Playbook Edge & Confluence Matrix** renders below the Cumulative R chart.
3. Switch between tabs:
   - **Confluences:** View win rates, Net R, and Expectancy for tags like "Liquidity Sweep" and "Order Block".
   - **Direction:** Compare Long vs Short win rates.
   - **Pairs:** Review performance per currency symbol.
4. Click any tag row in the matrix to verify that the search query updates and the historical setups grid filters to matching trades.

