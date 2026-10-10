# Step 32: Trade Journal CSV Export & Cumulative R Performance Curve

## 🎯 Objective
Empower traders to conduct institutional performance audits on the Setup History Hub (`/setups/history`). This step adds:
1. **Automated Trade Journal CSV Export:** Enables one-click downloading of all resolved setups formatted for tax accounting, spreadsheet modeling, or Notion trade logs.
2. **Cumulative R-Multiple Equity Curve:** An interactive SVG chart plotting cumulative risk-adjusted return (R-multiples) chronologically across all executed trades.
3. **Keyword & Tag Search Toolbar:** Instant client-side filtering by currency symbol, confluence setup tag (e.g., "Liquidity Sweep", "Fib 61.8"), or post-trade notes.

---

## 🛠 Step-by-Step Implementation

### 1. Create Export & Equity Curve Math Utilities (`lib/exportUtils.ts`)
Create utility functions to format CSV rows, trigger browser file downloads, and compute cumulative R data points.

**File:** `lib/exportUtils.ts`
```typescript
import type { TradingSetup } from "@/types/setup";

export type CumulativeRPoint = {
  tradeIndex: number;
  symbol: string;
  date: string;
  rReturn: number;
  cumulativeR: number;
};

/**
 * Computes running cumulative R-multiple performance points across resolved trades.
 */
export function calculateCumulativeRCurve(setups: TradingSetup[]): CumulativeRPoint[] {
  // 1. Filter to completed trades (Wins & Losses) and sort chronologically
  const completed = setups
    .filter((s) => s.status === "TP_REACHED" || s.status === "SL_HIT")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  let runningR = 0;
  return completed.map((s, index) => {
    const rReturn = s.status === "TP_REACHED" ? Number(s.riskReward) : -1.0;
    runningR = Number((runningR + rReturn).toFixed(2));

    return {
      tradeIndex: index + 1,
      symbol: s.symbol,
      date: new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      rReturn,
      cumulativeR: runningR,
    };
  });
}

/**
 * Formats setup records into standard CSV text and triggers browser file download.
 */
export function exportSetupsToCSV(setups: TradingSetup[]): void {
  const headers = [
    "Date Logged",
    "Symbol",
    "Direction",
    "Entry Min",
    "Entry Max",
    "Stop Loss",
    "Take Profit 1",
    "Risk Reward (RR)",
    "Status",
    "Invalidation Rule",
    "Confluence Tags",
    "Notes",
  ];

  const escapeCSV = (str: string | number | null | undefined) => {
    if (str === null || str === undefined) return '""';
    const clean = String(str).replace(/"/g, '""');
    return `"${clean}"`;
  };

  const rows = setups.map((s) => [
    escapeCSV(new Date(s.createdAt).toISOString().split("T")[0]),
    escapeCSV(s.symbol),
    escapeCSV(s.direction),
    escapeCSV(s.entryMin),
    escapeCSV(s.entryMax),
    escapeCSV(s.stopLoss),
    escapeCSV(s.takeProfit1),
    escapeCSV(`1:${s.riskReward.toFixed(1)}`),
    escapeCSV(s.status),
    escapeCSV(s.invalidationRule),
    escapeCSV(s.confluenceTags.join("; ")),
    escapeCSV(s.notes),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStr = new Date().toISOString().split("T")[0];
  link.setAttribute("href", url);
  link.setAttribute("download", `forex-pulse-trade-journal-${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

#### Why this was written this way:
- **RFC 4180 Compliant CSV Generation:** Wraps cells in quotes and doubles quotation marks (`""`) to prevent commas in confluence tags or notes from corrupting column alignment.
- **Client-Side Blob Download:** Generates files entirely in memory using standard `Blob` and `URL.createObjectURL`, avoiding server upload round-trips.
- **Strict R-Multiple Math:** Losses are assigned a strict `-1.0R` and wins are credited with their calculated `+riskReward` ratio, delivering an unskewed statistical distribution.

---

### 2. Create Cumulative R Equity Curve Chart (`components/setups/CumulativeRChart.tsx`)
Create a lightweight SVG performance curve component showing capital trajectory, drawdown dips, and breakeven reference lines.

**File:** `components/setups/CumulativeRChart.tsx`
```tsx
"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Target } from "lucide-react";
import type { TradingSetup } from "@/types/setup";
import { calculateCumulativeRCurve } from "@/lib/exportUtils";
import { cn } from "@/lib/utils";

interface CumulativeRChartProps {
  setups: TradingSetup[];
}

export function CumulativeRChart({ setups }: CumulativeRChartProps) {
  const points = useMemo(() => calculateCumulativeRCurve(setups), [setups]);

  if (points.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-xs text-muted-foreground">
        <Target className="h-6 w-6 opacity-30 mb-2" />
        <p className="font-medium">Insufficient performance data.</p>
        <p className="text-[11px] mt-0.5">Resolve at least 2 trade setups to render your cumulative R curve.</p>
      </div>
    );
  }

  const values = points.map((p) => p.cumulativeR);
  const minVal = Math.min(0, ...values);
  const maxVal = Math.max(1, ...values);
  const range = maxVal - minVal || 1;

  const width = 600;
  const height = 140;
  const paddingX = 16;
  const paddingY = 16;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Zero baseline Y position
  const zeroY = paddingY + chartHeight - ((0 - minVal) / range) * chartHeight;

  // Compute SVG point coordinates
  const svgCoords = points.map((pt, i) => {
    const x = paddingX + (i / (points.length - 1)) * chartWidth;
    const y = paddingY + chartHeight - ((pt.cumulativeR - minVal) / range) * chartHeight;
    return { x, y, pt };
  });

  const linePath = `M ${svgCoords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" L ")}`;
  const finalR = points[points.length - 1]?.cumulativeR ?? 0;
  const isPositive = finalR >= 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-rose-500" />
            )}
            Cumulative R-Multiple Curve
          </h3>
          <p className="text-xs text-muted-foreground">
            Risk-adjusted account growth across {points.length} closed trade setups.
          </p>
        </div>
        <div className="text-right">
          <span
            className={cn(
              "text-lg font-bold font-mono",
              isPositive ? "text-emerald-500" : "text-rose-500"
            )}
          >
            {finalR > 0 ? `+${finalR}R` : `${finalR}R`}
          </span>
          <p className="text-[10px] text-muted-foreground uppercase font-semibold">Net Realized</p>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-36 overflow-visible"
          preserveAspectRatio="none"
        >
          {/* Zero baseline */}
          <line
            x1={paddingX}
            y1={zeroY}
            x2={width - paddingX}
            y2={zeroY}
            stroke="currentColor"
            strokeDasharray="4 4"
            className="text-border"
            strokeWidth={1}
          />

          {/* Performance Line */}
          <path
            d={linePath}
            fill="none"
            stroke={isPositive ? "#10b981" : "#f43f5e"}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Dots on each trade */}
          {svgCoords.map((c, i) => (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r={3}
              className={isPositive ? "fill-emerald-500" : "fill-rose-500"}
            />
          ))}
        </svg>
      </div>

      {/* Trade Sequence Milestones */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
        <span>Trade #1 ({points[0]?.date})</span>
        <span>Latest: Trade #{points.length} ({points[points.length - 1]?.date})</span>
      </div>
    </div>
  );
}
```

#### Why this was written this way:
- **Zero-Dependency SVG Rendering:** Plots equity trajectory with pure SVG primitives (`<path>`, `<line>`, `<circle>`), avoiding massive external charting bundles like Recharts or Chart.js.
- **Zero R Breakeven Horizon:** Draws a dashed line at `0R` so the trader can instantly identify whether their statistical edge is compounding above baseline capital or experiencing drawdown.

---

### 3. Upgrade Setup History View (`components/setups/SetupHistoryView.tsx`)
Incorporate the CSV export action, the search bar, and the cumulative R equity curve into the history dashboard.

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

#### Why this was written this way:
- **Multi-Factor Search Integration:** Traders can search for specific confluences (e.g. typing `"Liquidity Sweep"` or `"Asian High"`) to review how specific setups have performed over time.
- **Direct Export Affordance:** The "Export CSV" button allows immediate offline backup and analysis in Excel, Python, or Google Sheets.

---

## 🧪 Verification & Testing
1. Navigate to `http://localhost:3000/setups/history` via the left sidebar.
2. Confirm the **Cumulative R-Multiple Curve** chart renders above the filter toolbar with the zero baseline line and running net R summary.
3. Click the **Export CSV** button and confirm that your browser downloads `forex-pulse-trade-journal-[DATE].csv`. Open the file to verify all columns are cleanly formatted.
4. Type in the search box (e.g. `"USDJPY"` or `"Fib"`) and verify the setup grid filters immediately.
5. Filter by Direction (`Long` or `Short`) and verify only matching trades appear.

