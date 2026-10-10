# Step 6: High-Impact Economic Calendar & News Risk Banner

## 🎯 Overview
In this step, we construct the macroeconomic event monitoring module. It tracks scheduled economic releases, filters high-impact volatility catalysts, maps currencies to affected forex pairs (e.g., USD release affects EUR/USD, USD/JPY, and XAU/USD), and displays an active risk countdown banner warning traders to avoid opening market orders during volatile news events.

---

### 1. Calendar Data Contract (`types/calendar.ts`)

**File:** `types/calendar.ts`
```typescript
export type EventImpact = "HIGH" | "MEDIUM" | "LOW";

export type EventTiming = "UPCOMING" | "IMMINENT" | "JUST_RELEASED" | "RELEASED";

export type NewsWindows = {
  preReleaseMinutes: number;
  postReleaseMinutes: number;
};

export interface EconomicEvent {
  id: string;
  currency: string;
  title: string;
  impact: EventImpact;
  scheduledAt: string; // ISO 8601 UTC
  actual: string | null;
  forecast: string | null;
  previous: string | null;
}
```

---

### 2. Event Timing & Instrument Mapping Logic (`lib/calendar.ts`)

Encapsulates time calculation math, mapping which forex pairs are at risk from a specific currency announcement.

**File:** `lib/calendar.ts`
```typescript
import type { EconomicEvent, EventTiming, NewsWindows } from "@/types/calendar";
import { INSTRUMENTS } from "@/lib/constants/instruments";
import { formatDayKeyPHT, formatDayLabelPHT } from "@/lib/formatters";

const MINUTE_MS = 60_000;

export function getMsUntilEvent(event: EconomicEvent, now: Date): number {
  return new Date(event.scheduledAt).getTime() - now.getTime();
}

export function getEventTiming(event: EconomicEvent, now: Date, windows: NewsWindows): EventTiming {
  const msUntil = getMsUntilEvent(event, now);

  if (msUntil > windows.preReleaseMinutes * MINUTE_MS) return "UPCOMING";
  if (msUntil > 0) return "IMMINENT";
  if (-msUntil <= windows.postReleaseMinutes * MINUTE_MS) return "JUST_RELEASED";
  return "RELEASED";
}

export function getUpcomingEvents(
  events: EconomicEvent[],
  now: Date,
  limit: number,
  windows: NewsWindows
): EconomicEvent[] {
  return events.filter((event) => getEventTiming(event, now, windows) !== "RELEASED").slice(0, limit);
}

export function getActiveNewsRisks(events: EconomicEvent[], now: Date, windows: NewsWindows): EconomicEvent[] {
  return events.filter((event) => {
    if (event.impact !== "HIGH") return false;
    const timing = getEventTiming(event, now, windows);
    return timing === "IMMINENT" || timing === "JUST_RELEASED";
  });
}

/** Which of our instruments contain this currency? USD -> EUR/USD, USD/JPY, XAU/USD... */
export function getAffectedInstruments(currency: string): string[] {
  return INSTRUMENTS.filter(
    (instrument) => instrument.base === currency || instrument.quote === currency
  ).map((instrument) => instrument.displayName);
}

export type EventDayGroup = {
  dayKey: string;
  label: string;
  events: EconomicEvent[];
};

export function groupEventsByDay(events: EconomicEvent[]): EventDayGroup[] {
  const groups = new Map<string, EventDayGroup>();

  for (const event of events) {
    const dayKey = formatDayKeyPHT(event.scheduledAt);
    const existing = groups.get(dayKey);

    if (existing) {
      existing.events.push(event);
    } else {
      groups.set(dayKey, { dayKey, label: formatDayLabelPHT(event.scheduledAt), events: [event] });
    }
  }

  return Array.from(groups.values());
}
```

#### Why this was written this way:
- **`getAffectedInstruments` Utility:** Traders don't just trade currencies in isolation; they trade currency pairs. If USD CPI drops, the function dynamically identifies that EUR/USD, USD/JPY, and Gold (XAU/USD) will experience spread widening.

---

### 3. Dynamic News Risk Warning Banner (`components/calendar/NewsRiskBanner.tsx`)

**File:** `components/calendar/NewsRiskBanner.tsx`
```tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Activity } from "lucide-react";
import type { EconomicEvent } from "@/types/calendar";
import { useNow } from "@/hooks/useNow";
import { getActiveNewsRisks, getAffectedInstruments, getEventTiming, getMsUntilEvent } from "@/lib/calendar";
import { formatDuration } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/useSettings";
import { getNewsWindows } from "@/lib/settings";

export function NewsRiskBanner({ events }: { events: EconomicEvent[] }) {
  const now = useNow();
  const { settings, isLoaded } = useSettings();
  const windows = getNewsWindows(settings);
  const risks = now && isLoaded ? getActiveNewsRisks(events, now, windows) : [];

  return (
    <AnimatePresence>
      {now && risks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="space-y-2">
            {risks.map((event) => {
              const isImminent = getEventTiming(event, now, windows) === "IMMINENT";
              const affected = getAffectedInstruments(event.currency);
              const Icon = isImminent ? AlertTriangle : Activity;

              return (
                <div
                  key={event.id}
                  role="alert"
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4",
                    isImminent
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  )}
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold">
                      {isImminent
                        ? `HIGH-IMPACT NEWS: ${event.currency} ${event.title} in ${formatDuration(getMsUntilEvent(event, now))}`
                        : `${event.currency} ${event.title} JUST RELEASED — EXPECT VOLATILITY`}
                    </p>
                    <p className="mt-0.5 opacity-90">
                      {isImminent ? "Avoid new entries on: " : "Spreads may widen on: "}
                      {affected.join(", ")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

### 4. Calendar Page Container (`app/(dashboard)/calendar/page.tsx`)

**File:** `app/(dashboard)/calendar/page.tsx`
```tsx
import { getEconomicEvents } from "@/lib/services/calendar";
import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";

export default async function CalendarPage() {
  const events = await getEconomicEvents();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight">This Week</h2>
        <p className="text-sm text-muted-foreground">
          All times in PHT. High-impact rows are highlighted based on your News Sensitivity setting.
        </p>
      </div>
      <CalendarWeekView events={events} />
    </div>
  );
}
```

#### Why this was written this way:
- **`AnimatePresence` Collapsing:** If no news risks are active within the user's defined window (e.g. 30 minutes before), the banner collapses to height 0 with zero wasted screen space.
