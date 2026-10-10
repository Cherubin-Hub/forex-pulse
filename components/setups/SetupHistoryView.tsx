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
