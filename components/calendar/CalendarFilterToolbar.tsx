"use client";

import { useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { syncEconomicCalendarAction } from "@/app/actions/calendarActions";

export type ImpactFilter = "ALL" | "MEDIUM_UP" | "HIGH";

interface CalendarFilterToolbarProps {
  selectedCurrency: string;
  onSelectCurrency: (curr: string) => void;
  impactFilter: ImpactFilter;
  onSelectImpact: (impact: ImpactFilter) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  matchingCount: number;
}

const CURRENCIES = ["ALL", "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "NZD"];

export function CalendarFilterToolbar({
  selectedCurrency,
  onSelectCurrency,
  impactFilter,
  onSelectImpact,
  searchQuery,
  onSearchChange,
  matchingCount,
}: CalendarFilterToolbarProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncReleases = async () => {
    setIsSyncing(true);
    try {
      const res = await syncEconomicCalendarAction();
      if (res.success) {
        toast.success("Macro Releases Synchronized", {
          description: res.message || "Verified calendar snapshot refreshed.",
        });
      } else {
        toast.error("Sync Failed", { description: res.error });
      }
    } catch (err) {
      toast.error("Sync Failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Impact Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant={impactFilter === "ALL" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs font-semibold"
            onClick={() => onSelectImpact("ALL")}
          >
            All Impact
          </Button>
          <Button
            variant={impactFilter === "MEDIUM_UP" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs font-semibold text-amber-500"
            onClick={() => onSelectImpact("MEDIUM_UP")}
          >
            Medium +
          </Button>
          <Button
            variant={impactFilter === "HIGH" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs font-semibold text-rose-500"
            onClick={() => onSelectImpact("HIGH")}
          >
            High Only
          </Button>
        </div>

        {/* Search & Sync Actions */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search CPI, NFP, GDP..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncReleases}
            disabled={isSyncing}
            className="h-8 px-2.5 text-xs font-medium gap-1.5 shrink-0"
            title="Synchronize and re-evaluate released catalysts"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-primary" : "text-muted-foreground"}`}
            />
            <span className="hidden sm:inline">Sync Actuals</span>
          </Button>
        </div>
      </div>

      {/* Currency Filter Pills */}
      <div className="flex flex-wrap items-center gap-1 pt-2 border-t border-border/50">
        <span className="text-[11px] font-medium text-muted-foreground mr-1">
          Currency:
        </span>
        {CURRENCIES.map((curr) => {
          const isSelected = selectedCurrency === curr;
          return (
            <Button
              key={curr}
              variant={isSelected ? "secondary" : "ghost"}
              size="sm"
              className="h-6 px-2 text-xs font-semibold"
              onClick={() => onSelectCurrency(curr)}
            >
              {curr}
            </Button>
          );
        })}
        <span className="ml-auto text-[11px] text-muted-foreground font-mono">
          {matchingCount} releases match
        </span>
      </div>
    </div>
  );
}
