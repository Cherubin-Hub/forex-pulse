"use client";

import { useState, useMemo } from "react";
import type { TradingSetup, SetupStatus } from "@/types/setup";
import { calculateSetupAnalytics } from "@/lib/analyticsUtils";
import { SetupAnalyticsSummary } from "@/components/setups/SetupAnalyticsSummary";
import { SetupGrid } from "@/components/setups/SetupGrid";
import { Button } from "@/components/ui/button";

type FilterStatus = "ALL" | "TP_REACHED" | "SL_HIT" | "INVALIDATED";

export function SetupHistoryView({ initialSetups }: { initialSetups: TradingSetup[] }) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");
  const [selectedDirection, setSelectedDirection] = useState<"ALL" | "LONG" | "SHORT">("ALL");

  // Filtered setups based on active pill buttons
  const filteredSetups = useMemo(() => {
    return initialSetups.filter((setup) => {
      const matchesStatus =
        filterStatus === "ALL" ? true : setup.status === filterStatus;
      const matchesDirection =
        selectedDirection === "ALL" ? true : setup.direction === selectedDirection;
      return matchesStatus && matchesDirection;
    });
  }, [initialSetups, filterStatus, selectedDirection]);

  // Analytics calculated across all historical setups (unfiltered baseline)
  const analytics = useMemo(() => {
    return calculateSetupAnalytics(initialSetups);
  }, [initialSetups]);

  return (
    <div className="space-y-6">
      {/* Performance Summary Metrics */}
      <SetupAnalyticsSummary analytics={analytics} />

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant={filterStatus === "ALL" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setFilterStatus("ALL")}
          >
            All Outcomes ({initialSetups.length})
          </Button>
          <Button
            variant={filterStatus === "TP_REACHED" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs text-emerald-500"
            onClick={() => setFilterStatus("TP_REACHED")}
          >
            Won (TP)
          </Button>
          <Button
            variant={filterStatus === "SL_HIT" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs text-rose-500"
            onClick={() => setFilterStatus("SL_HIT")}
          >
            Lost (SL)
          </Button>
          <Button
            variant={filterStatus === "INVALIDATED" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => setFilterStatus("INVALIDATED")}
          >
            Invalidated
          </Button>
        </div>

        {/* Direction Toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
          <Button
            variant={selectedDirection === "ALL" ? "default" : "ghost"}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setSelectedDirection("ALL")}
          >
            All
          </Button>
          <Button
            variant={selectedDirection === "LONG" ? "default" : "ghost"}
            size="sm"
            className="h-6 px-2 text-xs text-emerald-500"
            onClick={() => setSelectedDirection("LONG")}
          >
            Long
          </Button>
          <Button
            variant={selectedDirection === "SHORT" ? "default" : "ghost"}
            size="sm"
            className="h-6 px-2 text-xs text-rose-500"
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
