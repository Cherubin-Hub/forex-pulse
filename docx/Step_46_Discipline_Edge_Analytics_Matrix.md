# Step 46: Discipline Edge Analytics & Execution Leakage Matrix

## 🎯 Objective
Elevate Forex Pulse's post-trade analytics by introducing the **Discipline Edge Analytics & Execution Leakage Matrix** on `/setups/history`. In institutional proprietary trading, the ultimate edge is empirical proof that following one's rules generates profits, while breaking rules causes capital destruction. This step delivers:
1. **Discipline Edge & Leakage Mathematical Engine (`lib/disciplineAnalyticsUtils.ts`):** Calculates win rate, expectancy, and R-multiple yield broken down by execution grade (`A`, `B`, `C`, `D`, `F`), psychological mindset (`Disciplined`, `Anxious`, `FOMO`, `Revenge`), and aggregates **Preventable Execution Leakage** (total R and dollars lost to unforced errors like moving stop losses or premature exits).
2. **Interactive Discipline Edge Matrix Component (`components/setups/DisciplineEdgeMatrix.tsx`):** Visual card displaying side-by-side performance comparison across execution grades, an emotional mindset performance heatmap, and an institutional leakage callout highlighting the exact profit boost the trader would achieve by eliminating emotional mistakes.
3. **Execution Grade Filter in Setup History View (`components/setups/SetupHistoryView.tsx`):** Seamlessly integrates the matrix into the setup history dashboard, enabling traders to filter historical trade records by their awarded execution grade.

---

## 🛠 Step-by-Step Implementation

### 1. Create Discipline Analytics & Leakage Engine (`lib/disciplineAnalyticsUtils.ts`)
This utility computes process performance metrics, psychology correlation, and unforced mistake leakage.

**File:** `lib/disciplineAnalyticsUtils.ts`
```typescript
import type { TradingSetup } from "@/types/setup";
import {
  type TradePostMortem,
  type ExecutionGrade,
  type PsychologicalState,
  type MistakeCategory,
  calculateRealizedR,
} from "@/lib/postMortemUtils";

export type GradeMetric = {
  grade: ExecutionGrade;
  count: number;
  winCount: number;
  lossCount: number;
  winRate: number; // 0% to 100%
  totalR: number;
  avgR: number;
};

export type PsychologyMetric = {
  state: PsychologicalState;
  count: number;
  winRate: number;
  totalR: number;
};

export type MistakeLeakage = {
  mistake: MistakeCategory;
  label: string;
  count: number;
  lostR: number; // Negative or positive R impact
};

export type DisciplineEdgeSummary = {
  totalReviewed: number;
  gradeMetrics: GradeMetric[];
  psychologyMetrics: PsychologyMetric[];
  mistakeLeakages: MistakeLeakage[];
  totalPreventableLeakageR: number;
  disciplinedVsUndisciplinedEdgeR: number;
};

const MISTAKE_LABELS: Record<MistakeCategory, string> = {
  NONE: "None (Executed to Plan)",
  EARLY_ENTRY: "Early Entry (Chased)",
  LATE_CHASE: "Late Chase",
  MOVED_SL: "Moved Stop Loss (Widened)",
  PREMATURE_EXIT: "Premature Exit",
  OVERSIZED: "Oversized Position",
  NEWS_GAMBLE: "News Gamble",
  IGNORED_HTF_BIAS: "Ignored HTF Trend",
};

/**
 * Computes statistical performance breakdown across execution grades, mindsets, and mistake leakages.
 */
export function calculateDisciplineEdge(
  setups: TradingSetup[],
  reviews: Record<string, TradePostMortem>
): DisciplineEdgeSummary {
  const resolved = setups.filter(
    (s) => s.status === "TP_REACHED" || s.status === "SL_HIT" || s.status === "INVALIDATED"
  );

  const gradeGroups: Record<ExecutionGrade, { wins: number; losses: number; r: number; count: number }> = {
    A: { wins: 0, losses: 0, r: 0, count: 0 },
    B: { wins: 0, losses: 0, r: 0, count: 0 },
    C: { wins: 0, losses: 0, r: 0, count: 0 },
    D: { wins: 0, losses: 0, r: 0, count: 0 },
    F: { wins: 0, losses: 0, r: 0, count: 0 },
  };

  const psychologyGroups: Record<string, { wins: number; losses: number; r: number; count: number }> = {};
  const mistakeGroups: Record<string, { lostR: number; count: number }> = {};

  let totalReviewed = 0;

  for (const s of resolved) {
    const rev = reviews[s.id];
    if (!rev) continue;

    totalReviewed += 1;
    const r = calculateRealizedR(s);
    const isWin = s.status === "TP_REACHED";
    const isLoss = s.status === "SL_HIT";

    // 1. Grade Grouping
    gradeGroups[rev.grade].count += 1;
    gradeGroups[rev.grade].r += r;
    if (isWin) gradeGroups[rev.grade].wins += 1;
    if (isLoss) gradeGroups[rev.grade].losses += 1;

    // 2. Psychology Grouping
    if (!psychologyGroups[rev.psychology]) {
      psychologyGroups[rev.psychology] = { wins: 0, losses: 0, r: 0, count: 0 };
    }
    psychologyGroups[rev.psychology].count += 1;
    psychologyGroups[rev.psychology].r += r;
    if (isWin) psychologyGroups[rev.psychology].wins += 1;
    if (isLoss) psychologyGroups[rev.psychology].losses += 1;

    // 3. Mistake Grouping
    if (rev.mistake !== "NONE") {
      if (!mistakeGroups[rev.mistake]) {
        mistakeGroups[rev.mistake] = { lostR: 0, count: 0 };
      }
      mistakeGroups[rev.mistake].count += 1;
      if (r < 0) {
        mistakeGroups[rev.mistake].lostR += Math.abs(r);
      }
    }
  }

  // Build Grade Metrics
  const gradeMetrics: GradeMetric[] = (["A", "B", "C", "D", "F"] as ExecutionGrade[]).map((grade) => {
    const data = gradeGroups[grade];
    const winRate = data.count > 0 ? Math.round((data.wins / data.count) * 100) : 0;
    const avgR = data.count > 0 ? Number((data.r / data.count).toFixed(2)) : 0;

    return {
      grade,
      count: data.count,
      winCount: data.wins,
      lossCount: data.losses,
      winRate,
      totalR: Number(data.r.toFixed(1)),
      avgR,
    };
  });

  // Build Psychology Metrics
  const psychologyMetrics: PsychologyMetric[] = Object.entries(psychologyGroups).map(
    ([stateStr, data]) => {
      const state = stateStr as PsychologicalState;
      const winRate = data.count > 0 ? Math.round((data.wins / data.count) * 100) : 0;

      return {
        state,
        count: data.count,
        winRate,
        totalR: Number(data.r.toFixed(1)),
      };
    }
  ).sort((a, b) => b.totalR - a.totalR);

  // Build Mistake Leakages
  let totalPreventableLeakageR = 0;
  const mistakeLeakages: MistakeLeakage[] = Object.entries(mistakeGroups).map(([mistakeStr, data]) => {
    const mistake = mistakeStr as MistakeCategory;
    totalPreventableLeakageR += data.lostR;

    return {
      mistake,
      label: MISTAKE_LABELS[mistake] ?? mistakeStr,
      count: data.count,
      lostR: Number(data.lostR.toFixed(1)),
    };
  }).sort((a, b) => b.lostR - a.lostR);

  // Calculate Edge: Grade A/B average vs Grade C/D/F average
  const goodR = gradeGroups.A.r + gradeGroups.B.r;
  const badR = gradeGroups.C.r + gradeGroups.D.r + gradeGroups.F.r;
  const disciplinedVsUndisciplinedEdgeR = Number((goodR - badR).toFixed(1));

  return {
    totalReviewed,
    gradeMetrics,
    psychologyMetrics,
    mistakeLeakages,
    totalPreventableLeakageR: Number(totalPreventableLeakageR.toFixed(1)),
    disciplinedVsUndisciplinedEdgeR,
  };
}
```

#### Why this was written this way:
- **Discipline Attribution:** Statistically proves the causal relationship between following rules (`Grade A`) and profitability, isolating preventable execution leakages.
- **Quantified Cost of Mistakes:** Gives concrete numerical weight to bad habits (e.g., `-3.0R lost to moving stop losses`), transforming subjective discipline into objective financial data.

---

### 2. Create Discipline Edge Matrix Component (`components/setups/DisciplineEdgeMatrix.tsx`)
Create the visual analytics card displaying grade performance bars, emotional mindset correlations, and preventable leakage highlights.

**File:** `components/setups/DisciplineEdgeMatrix.tsx`
```tsx
"use client";

import { useMemo } from "react";
import { Award, Brain, AlertOctagon, TrendingUp, Sparkles, CheckCircle2 } from "lucide-react";
import type { TradingSetup } from "@/types/setup";
import { type ExecutionGrade, loadAllPostMortems, getGradeBadgeColor } from "@/lib/postMortemUtils";
import { calculateDisciplineEdge } from "@/lib/disciplineAnalyticsUtils";
import { cn } from "@/lib/utils";

interface DisciplineEdgeMatrixProps {
  setups: TradingSetup[];
  selectedGrade?: "ALL" | ExecutionGrade;
  onSelectGrade?: (grade: "ALL" | ExecutionGrade) => void;
}

export function DisciplineEdgeMatrix({
  setups,
  selectedGrade = "ALL",
  onSelectGrade,
}: DisciplineEdgeMatrixProps) {
  const reviews = useMemo(() => {
    return loadAllPostMortems();
  }, []);

  const edge = useMemo(() => {
    return calculateDisciplineEdge(setups, reviews);
  }, [setups, reviews]);

  if (edge.totalReviewed === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-xs text-muted-foreground space-y-1.5">
        <Award className="h-6 w-6 mx-auto opacity-30 text-primary" />
        <p className="font-semibold text-foreground">Discipline Edge Analytics</p>
        <p>Log post-mortem reviews on your resolved trades below to unlock execution quality metrics.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            Process Adherence & Discipline Edge Matrix
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Empirical performance correlation: Process Grade vs Financial Return across {edge.totalReviewed} reviewed setups.
          </p>
        </div>

        {edge.totalPreventableLeakageR > 0 && (
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-500 font-semibold">
            <AlertOctagon className="h-3.5 w-3.5" />
            <span>Preventable Leakage: -{edge.totalPreventableLeakageR}R</span>
          </div>
        )}
      </div>

      {/* Grade Performance Leaderboard */}
      <div className="grid gap-2 sm:grid-cols-5">
        {edge.gradeMetrics.map((g) => {
          const isSelected = selectedGrade === g.grade;

          return (
            <button
              key={g.grade}
              type="button"
              onClick={() => onSelectGrade?.(isSelected ? "ALL" : g.grade)}
              className={cn(
                "flex flex-col justify-between p-3 rounded-lg border text-left transition-all",
                isSelected
                  ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                  : "border-border/70 bg-muted/20 hover:bg-muted/40"
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("rounded border px-1.5 py-0.2 text-[10px] font-mono font-bold", getGradeBadgeColor(g.grade))}>
                  Grade {g.grade}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">{g.count} trades</span>
              </div>

              <div className="mt-2 space-y-0.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-muted-foreground">Win Rate:</span>
                  <span className="font-mono text-xs font-bold text-foreground">{g.winRate}%</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-muted-foreground">Net R:</span>
                  <span
                    className={cn(
                      "font-mono text-xs font-bold",
                      g.totalR > 0 ? "text-emerald-500" : g.totalR < 0 ? "text-rose-500" : "text-muted-foreground"
                    )}
                  >
                    {g.totalR > 0 ? `+${g.totalR}R` : `${g.totalR}R`}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Insights: Psychology Breakdown & Execution Leakage */}
      <div className="grid sm:grid-cols-2 gap-4 pt-1">
        {/* Psychological Mindset Edge */}
        <div className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <Brain className="h-3.5 w-3.5 text-sky-500" />
            <span>Mindset Return Correlation</span>
          </div>
          <div className="space-y-1.5">
            {edge.psychologyMetrics.map((p) => (
              <div key={p.state} className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground capitalize font-medium">
                  {p.state.toLowerCase()} ({p.count})
                </span>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-muted-foreground">{p.winRate}% WR</span>
                  <span
                    className={cn(
                      "font-bold",
                      p.totalR > 0 ? "text-emerald-500" : p.totalR < 0 ? "text-rose-500" : "text-muted-foreground"
                    )}
                  >
                    {p.totalR > 0 ? `+${p.totalR}R` : `${p.totalR}R`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unforced Mistakes Leakage Ledger */}
        <div className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <AlertOctagon className="h-3.5 w-3.5 text-rose-500" />
            <span>Cost of Unforced Mistakes</span>
          </div>
          {edge.mistakeLeakages.length === 0 ? (
            <p className="text-[11px] text-muted-foreground py-2">
              Flawless execution! Zero mistake leakages recorded.
            </p>
          ) : (
            <div className="space-y-1.5">
              {edge.mistakeLeakages.map((m) => (
                <div key={m.mistake} className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground truncate max-w-[200px]" title={m.label}>
                    {m.label} ({m.count})
                  </span>
                  <span className="font-mono font-bold text-rose-500">
                    -{m.lostR}R
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

#### Why this was written this way:
- **Interactive Grade Filtering:** Clicking on any grade card toggles filtering across the setup history list below.
- **Empirical Edge Visualization:** Displays objective evidence that discipline directly generates positive expectation.

---

### 3. Upgrade Setup History View (`components/setups/SetupHistoryView.tsx`)
Embed the `DisciplineEdgeMatrix` and incorporate execution grade filtering into the toolbar.

**File:** `components/setups/SetupHistoryView.tsx`
```tsx
"use client";

import { useState, useMemo } from "react";
import { Download, Search } from "lucide-react";
import type { TradingSetup } from "@/types/setup";
import { calculateSetupAnalytics } from "@/lib/analyticsUtils";
import { exportSetupsToCSV } from "@/lib/exportUtils";
import {
  type ExecutionGrade,
  loadAllPostMortems,
} from "@/lib/postMortemUtils";
import { SetupAnalyticsSummary } from "@/components/setups/SetupAnalyticsSummary";
import { CumulativeRChart } from "@/components/setups/CumulativeRChart";
import { ConfluenceTagMatrix } from "@/components/setups/ConfluenceTagMatrix";
import { DisciplineEdgeMatrix } from "@/components/setups/DisciplineEdgeMatrix";
import { SetupGrid } from "@/components/setups/SetupGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FilterStatus = "ALL" | "TP_REACHED" | "SL_HIT" | "INVALIDATED";

export function SetupHistoryView({ initialSetups }: { initialSetups: TradingSetup[] }) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");
  const [selectedDirection, setSelectedDirection] = useState<"ALL" | "LONG" | "SHORT">("ALL");
  const [selectedGrade, setSelectedGrade] = useState<"ALL" | ExecutionGrade>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const reviews = useMemo(() => {
    return loadAllPostMortems();
  }, []);

  // Filtered setups based on active status, direction, grade, and keyword search
  const filteredSetups = useMemo(() => {
    return initialSetups.filter((setup) => {
      const matchesStatus =
        filterStatus === "ALL" ? true : setup.status === filterStatus;
      const matchesDirection =
        selectedDirection === "ALL" ? true : setup.direction === selectedDirection;

      const review = reviews[setup.id];
      const matchesGrade =
        selectedGrade === "ALL" ? true : review?.grade === selectedGrade;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        setup.symbol.toLowerCase().includes(q) ||
        setup.notes.toLowerCase().includes(q) ||
        setup.confluenceTags.some((tag) => tag.toLowerCase().includes(q));

      return matchesStatus && matchesDirection && matchesGrade && matchesSearch;
    });
  }, [initialSetups, filterStatus, selectedDirection, selectedGrade, searchQuery, reviews]);

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

      {/* Discipline Edge & Process Adherence Matrix */}
      <DisciplineEdgeMatrix
        setups={initialSetups}
        selectedGrade={selectedGrade}
        onSelectGrade={(g) => setSelectedGrade(g)}
      />

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

        {/* Direction & Grade Filter Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-xs">
          {/* Direction */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium text-muted-foreground mr-1">Direction:</span>
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

          {/* Grade Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium text-muted-foreground mr-1">Grade:</span>
            {(["ALL", "A", "B", "C", "D", "F"] as const).map((g) => (
              <Button
                key={g}
                variant={selectedGrade === g ? "secondary" : "ghost"}
                size="sm"
                className="h-6 px-2 text-[11px] font-mono font-bold"
                onClick={() => setSelectedGrade(g)}
              >
                {g === "ALL" ? "All" : g}
              </Button>
            ))}
          </div>
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
1. Navigate to **`/setups/history`**.
2. Examine the **Process Adherence & Discipline Edge Matrix**:
   - Verify performance metrics are grouped across Execution Grades (`A`, `B`, `C`, `D`, `F`).
   - Notice the **Mindset Return Correlation** breakdown.
   - Inspect the **Cost of Unforced Mistakes** ledger quantifying lost R-multiples.
3. Click on **Grade A** in the matrix:
   - Verify the history list instantly filters to show only Grade A setups.
4. Toggle the Grade filters in the bottom toolbar (`All`, `A`, `B`, `C`, `D`, `F`).
5. Run `npx tsc --noEmit` to verify 0 compilation errors across the entire codebase.

