"use client";
import { useSettings } from "@/hooks/useSettings";

import { useState, useEffect, useMemo } from "react";
import { Download, Search } from "lucide-react";
import type { TradingSetup } from "@/types/setup";
import { calculateSetupAnalytics } from "@/lib/analyticsUtils";
import { exportSetupsToCSV } from "@/lib/exportUtils";
import {
  type ExecutionGrade,
  type TradePostMortem,
  loadAllPostMortems,
} from "@/lib/postMortemUtils";
import { SetupAnalyticsSummary } from "@/components/setups/SetupAnalyticsSummary";
import { CumulativeRChart } from "@/components/setups/CumulativeRChart";
import { ConfluenceTagMatrix } from "@/components/setups/ConfluenceTagMatrix";
import { DisciplineEdgeMatrix } from "@/components/setups/DisciplineEdgeMatrix";
import { SetupGrid } from "@/components/setups/SetupGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getPostMortemsAction,
  syncPostMortemsAction,
} from "@/app/actions/postMortemActions";

type FilterStatus = "ALL" | "TP_REACHED" | "SL_HIT" | "INVALIDATED";

export function SetupHistoryView({
  initialSetups,
}: {
  initialSetups: TradingSetup[];
}) {
  const { identity } = useSettings();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");
  const [selectedDirection, setSelectedDirection] = useState<
    "ALL" | "LONG" | "SHORT"
  >("ALL");
  const [selectedGrade, setSelectedGrade] = useState<"ALL" | ExecutionGrade>(
    "ALL",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [reviews, setReviews] = useState<Record<string, TradePostMortem>>({});
  const [visibleCount, setVisibleCount] = useState<number>(12);

  // Sync post-mortems from localStorage & cloud with hydration safety
  useEffect(() => {
    const local = loadAllPostMortems(identity?.userId);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration match pattern
    setReviews(local);

    if (identity?.userId) {
      getPostMortemsAction(identity.userId).then((cloud) => {
        if (cloud && Object.keys(cloud).length > 0) {
          setReviews(cloud);
        } else if (Object.keys(local).length > 0) {
          syncPostMortemsAction(identity.userId);
        }
      }).catch((err) => {
        console.warn("[SetupHistory] Cloud reviews sync notice:", err);
      });
    }
  }, [identity?.userId]);

  // Filtered setups based on active status, direction, grade, and keyword search
  const filteredSetups = useMemo(() => {
    return initialSetups.filter((setup) => {
      const matchesStatus =
        filterStatus === "ALL" ? true : setup.status === filterStatus;
      const matchesDirection =
        selectedDirection === "ALL"
          ? true
          : setup.direction === selectedDirection;

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
  }, [
    initialSetups,
    filterStatus,
    selectedDirection,
    selectedGrade,
    searchQuery,
    reviews,
  ]);

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
        reviews={reviews}
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
            <span className="text-[11px] font-medium text-muted-foreground mr-1">
              Direction:
            </span>
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
            <span className="text-[11px] font-medium text-muted-foreground mr-1">
              Grade:
            </span>
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

      {/* Setup Cards Grid with Pagination */}
      <SetupGrid setups={filteredSetups.slice(0, visibleCount)} />

      {filteredSetups.length > visibleCount && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{visibleCount}</span> of{" "}
            <span className="font-semibold text-foreground">{filteredSetups.length}</span> setups
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => setVisibleCount((prev) => Math.min(prev + 12, filteredSetups.length))}
            >
              Load More ({filteredSetups.length - visibleCount} remaining)
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 text-muted-foreground hover:text-foreground"
              onClick={() => setVisibleCount(filteredSetups.length)}
            >
              Show All
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
