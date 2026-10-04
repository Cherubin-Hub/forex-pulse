"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { EconomicEvent, EventImpact } from "@/types/calendar";
import { useNow } from "@/hooks/useNow";
import { groupEventsByDay } from "@/lib/calendar";
import { EventRow } from "@/components/calendar/EventRow";
import { cn } from "@/lib/utils";

type ImpactFilter = "ALL" | "MEDIUM_UP" | "HIGH";

const FILTER_OPTIONS: { value: ImpactFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "MEDIUM_UP", label: "Medium +" },
  { value: "HIGH", label: "High only" },
];

const FILTER_RULES: Record<ImpactFilter, EventImpact[]> = {
  ALL: ["HIGH", "MEDIUM", "LOW"],
  MEDIUM_UP: ["HIGH", "MEDIUM"],
  HIGH: ["HIGH"],
};

export function CalendarWeekView({ events }: { events: EconomicEvent[] }) {
  const now = useNow();
  const [filter, setFilter] = useState<ImpactFilter>("ALL");

  const visibleEvents = events.filter((event) => FILTER_RULES[filter].includes(event.impact));
  const dayGroups = groupEventsByDay(visibleEvents);

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="inline-flex rounded-lg border border-border bg-card p-1">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={cn(
              "relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              filter === option.value ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {filter === option.value && (
              <motion.span
                layoutId="calendar-filter-pill"
                className="absolute inset-0 rounded-md bg-muted"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        ))}
      </div>

      {/* Days */}
      {!now ? (
        <div className="h-96 animate-pulse rounded-xl border border-border bg-card" />
      ) : dayGroups.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No events match this filter.</p>
      ) : (
        dayGroups.map((group) => (
          <section key={group.dayKey} className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm">
            <h2 className="mb-2 px-3 text-sm font-semibold">{group.label}</h2>
            <div className="space-y-1">
              {group.events.map((event) => (
                <EventRow key={event.id} event={event} now={now} showAffected />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
