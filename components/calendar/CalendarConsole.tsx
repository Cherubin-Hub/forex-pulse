"use client";

import { useState, useMemo } from "react";
import type { EconomicEvent, EventImpact } from "@/types/calendar";
import { useNow } from "@/hooks/useNow";
import { groupEventsByDay } from "@/lib/calendar";
import { EventRow } from "@/components/calendar/EventRow";
import { EventCountdownRadar } from "@/components/calendar/EventCountdownRadar";
import { CalendarMetricsSummary } from "@/components/calendar/CalendarMetricsSummary";
import { CalendarFilterToolbar, type ImpactFilter } from "@/components/calendar/CalendarFilterToolbar";

const FILTER_RULES: Record<ImpactFilter, EventImpact[]> = {
  ALL: ["HIGH", "MEDIUM", "LOW"],
  MEDIUM_UP: ["HIGH", "MEDIUM"],
  HIGH: ["HIGH"],
};

interface CalendarConsoleProps {
  events: EconomicEvent[];
  available?: boolean;
}

export function CalendarConsole({ events, available = true }: CalendarConsoleProps) {
  const now = useNow();
  const [selectedCurrency, setSelectedCurrency] = useState<string>("ALL");
  const [impactFilter, setImpactFilter] = useState<ImpactFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchesImpact = FILTER_RULES[impactFilter].includes(e.impact);
      const matchesCurrency = selectedCurrency === "ALL" ? true : e.currency === selectedCurrency;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        e.title.toLowerCase().includes(q) ||
        e.currency.toLowerCase().includes(q);

      return matchesImpact && matchesCurrency && matchesSearch;
    });
  }, [events, impactFilter, selectedCurrency, searchQuery]);

  const dayGroups = useMemo(() => {
    return groupEventsByDay(filteredEvents);
  }, [filteredEvents]);

  return (
    <div className="space-y-6">
      {/* Live High-Impact Countdown Radar */}
      <EventCountdownRadar events={events} />

      {/* Macro Metrics Summary Strip */}
      <CalendarMetricsSummary events={events} />

      {!available && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-500 font-medium">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Macroeconomic feed coverage is stale or currently in demo mode. High-impact news safety buffer is enforced.</span>
        </div>
      )}
      {/* Filter & Search Toolbar */}
      <CalendarFilterToolbar
        selectedCurrency={selectedCurrency}
        onSelectCurrency={setSelectedCurrency}
        impactFilter={impactFilter}
        onSelectImpact={setImpactFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        matchingCount={filteredEvents.length}
      />

      {/* Day-by-Day Event Groups */}
      {!now ? (
        <div className="h-96 animate-pulse rounded-xl border border-border bg-card" />
      ) : dayGroups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-xs text-muted-foreground">
          No economic releases match your active filters.
        </div>
      ) : (
        <div className="space-y-4">
          {dayGroups.map((group) => (
            <section
              key={group.dayKey}
              className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm space-y-2"
            >
              <h3 className="px-3 text-sm font-semibold text-foreground flex items-center justify-between">
                <span>{group.label}</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  {group.events.length} releases
                </span>
              </h3>
              <div className="divide-y divide-border/40">
                {group.events.map((event) => (
                  <EventRow key={event.id} event={event} now={now} showAffected />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
