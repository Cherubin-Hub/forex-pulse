"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CalendarCheck } from "lucide-react";
import type { EconomicEvent } from "@/types/calendar";
import { useNow } from "@/hooks/useNow";
import { getUpcomingEvents } from "@/lib/calendar";
import { DASHBOARD_EVENT_LIMIT } from "@/lib/constants/calendar";
import { EventRow } from "@/components/calendar/EventRow";

export function UpcomingEventsPanel({ events }: { events: EconomicEvent[] }) {
  const now = useNow();

  return (
    <section className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Upcoming Events</h2>
          <p className="text-sm text-muted-foreground">Next releases this week (PHT).</p>
        </div>
        <Link
          href="/calendar"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Full calendar <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {!now ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <UpcomingList events={getUpcomingEvents(events, now, DASHBOARD_EVENT_LIMIT)} now={now} />
      )}
    </section>
  );
}

function UpcomingList({ events, now }: { events: EconomicEvent[]; now: Date }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
        <CalendarCheck className="h-6 w-6" />
        No upcoming events this week.
      </div>
    );
  }

  return (
    <ul className="space-y-1">
      <AnimatePresence initial={false}>
        {events.map((event) => (
          <motion.li
            key={event.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
          >
            <EventRow event={event} now={now} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
