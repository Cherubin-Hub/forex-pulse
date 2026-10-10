# Step 35: Macro Event Volatility Radar & Multi-Currency Calendar Console

## 🎯 Objective
Upgrade the Economic Calendar (`/calendar`) into an institutional macroeconomic intelligence hub. This step delivers:
1. **Next High-Impact Event Live Countdown & "No-Trade Zone" Risk Radar:** Identifies the immediate next high-impact release, computes a live ticking countdown, highlights all affected currency pairs, and triggers a visual "NO TRADE ZONE" warning when high-impact news is within 30 minutes.
2. **Weekly Macro Risk Metrics Strip:** Summarizes total weekly releases, high-impact catalysts, the primary volatility currency driver (e.g. `USD`), and active risk windows.
3. **Multi-Currency & Keyword Release Filtering Toolbar:** Enables one-click filtering by specific currency (`USD`, `EUR`, `GBP`, `JPY`, `AUD`, `CAD`, `NZD`, `CHF`), impact tier (`All`, `Medium+`, `High only`), and title search (`CPI`, `NFP`, `Rate Decision`, `PMI`).
4. **Actual vs Forecast Deviation Surprise Engine:** Analyzes macro releases to determine whether economic indicators beat or missed forecasts (Bullish vs Bearish Surprise).

---

## 🛠 Step-by-Step Implementation

### 1. Expand Calendar Analytical Utilities (`lib/calendar.ts`)
Add helper functions to calculate next upcoming high-impact events, weekly metric aggregations, and economic surprise deviation tags.

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

/**
 * Finds the immediate next upcoming HIGH impact event relative to current time.
 */
export function getNextHighImpactEvent(
  events: EconomicEvent[],
  now: Date
): { event: EconomicEvent; msUntil: number } | null {
  const futureHighs = events
    .filter((e) => e.impact === "HIGH")
    .map((e) => ({ event: e, msUntil: getMsUntilEvent(e, now) }))
    .filter((item) => item.msUntil > 0)
    .sort((a, b) => a.msUntil - b.msUntil);

  return futureHighs[0] ?? null;
}

export type CalendarWeeklyMetrics = {
  totalEvents: number;
  highImpactCount: number;
  mediumImpactCount: number;
  primaryCurrency: string;
  primaryCurrencyCount: number;
};

/**
 * Calculates macroeconomic distribution metrics across all weekly events.
 */
export function calculateCalendarWeeklyMetrics(events: EconomicEvent[]): CalendarWeeklyMetrics {
  const totalEvents = events.length;
  const highImpactCount = events.filter((e) => e.impact === "HIGH").length;
  const mediumImpactCount = events.filter((e) => e.impact === "MEDIUM").length;

  const currencyCounts: Record<string, number> = {};
  for (const e of events) {
    currencyCounts[e.currency] = (currencyCounts[e.currency] ?? 0) + (e.impact === "HIGH" ? 2 : 1);
  }

  let primaryCurrency = "USD";
  let maxWeight = 0;
  for (const [curr, weight] of Object.entries(currencyCounts)) {
    if (weight > maxWeight) {
      maxWeight = weight;
      primaryCurrency = curr;
    }
  }

  const primaryCurrencyCount = events.filter((e) => e.currency === primaryCurrency).length;

  return {
    totalEvents,
    highImpactCount,
    mediumImpactCount,
    primaryCurrency,
    primaryCurrencyCount,
  };
}

/**
 * Analyzes whether an actual release beat or missed forecast numbers.
 */
export function evaluateSurprise(actual: string | null, forecast: string | null): "BEAT" | "MISS" | "IN_LINE" | null {
  if (!actual || !forecast) return null;

  const parseNum = (str: string) => {
    const clean = str.replace(/[^0-9.-]/g, "");
    const val = parseFloat(clean);
    return isNaN(val) ? null : val;
  };

  const actVal = parseNum(actual);
  const fcVal = parseNum(forecast);

  if (actVal === null || fcVal === null) return null;
  if (actVal > fcVal) return "BEAT";
  if (actVal < fcVal) return "MISS";
  return "IN_LINE";
}
```

#### Why this was written this way:
- **Weighted Currency Impact:** When finding the `primaryCurrency`, high-impact events carry double weight, ensuring that 2 high-impact USD events outweigh 3 low-impact EUR events.
- **Robust Numeric Parsing:** Strips `%`, `K`, `M`, and non-numeric suffixes so that values like `"150K"` and `"142K"`, or `"0.3%"` and `"0.4%"` can be compared reliably without type errors.

---

### 2. Create Next High-Impact Event Countdown Radar (`components/calendar/EventCountdownRadar.tsx`)
Create a real-time HUD component that counts down to the next high-impact economic release and warns of active "No-Trade" windows.

**File:** `components/calendar/EventCountdownRadar.tsx`
```tsx
"use client";

import { useMemo } from "react";
import { AlertOctagon, Clock, ShieldCheck, Flame } from "lucide-react";
import type { EconomicEvent } from "@/types/calendar";
import { useNow } from "@/hooks/useNow";
import { getNextHighImpactEvent, getAffectedInstruments } from "@/lib/calendar";
import { formatClockPHT, formatDuration } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface EventCountdownRadarProps {
  events: EconomicEvent[];
}

export function EventCountdownRadar({ events }: EventCountdownRadarProps) {
  const now = useNow();

  const nextHigh = useMemo(() => {
    if (!now) return null;
    return getNextHighImpactEvent(events, now);
  }, [events, now]);

  if (!now) {
    return <div className="h-32 rounded-xl bg-card/50 border border-border animate-pulse" />;
  }

  if (!nextHigh) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400">
        <ShieldCheck className="h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">Macro Horizon Clear</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            No further high-impact releases scheduled for the remainder of this session.
          </p>
        </div>
      </div>
    );
  }

  const { event, msUntil } = nextHigh;
  const isImminent = msUntil <= 30 * 60 * 1000; // Less than 30 minutes away
  const affected = getAffectedInstruments(event.currency);

  return (
    <div
      className={cn(
        "rounded-xl border p-4 shadow-sm transition-all",
        isImminent
          ? "border-rose-500/40 bg-rose-500/10 dark:bg-rose-950/20"
          : "border-border bg-card"
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {isImminent ? (
              <span className="flex items-center gap-1.5 rounded-md bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white uppercase tracking-wider animate-pulse">
                <AlertOctagon className="h-3.5 w-3.5" />
                No-Trade Zone Active
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary uppercase tracking-wider">
                <Flame className="h-3.5 w-3.5" />
                Next High-Impact Catalyst
              </span>
            )}
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono font-bold">
              {event.currency}
            </span>
          </div>

          <h3 className="text-base font-bold tracking-tight text-foreground">
            {event.title}
          </h3>

          <p className="text-xs text-muted-foreground">
            Scheduled at {formatClockPHT(event.scheduledAt)} (PHT) • Forecast:{" "}
            <span className="font-semibold text-foreground">{event.forecast ?? "N/A"}</span> • Previous:{" "}
            <span className="font-semibold text-foreground">{event.previous ?? "N/A"}</span>
          </p>
        </div>

        {/* Live Countdown Badge */}
        <div className="flex flex-col sm:items-end justify-center shrink-0">
          <div className="flex items-center gap-1.5">
            <Clock className={cn("h-4 w-4", isImminent ? "text-rose-500" : "text-muted-foreground")} />
            <span
              className={cn(
                "text-xl font-extrabold font-mono",
                isImminent ? "text-rose-500" : "text-primary"
              )}
            >
              in {formatDuration(msUntil)}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">Time Until Release</span>
        </div>
      </div>

      {/* Affected Instruments Chips */}
      {affected.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground mr-1">
            Expected Volatility in:
          </span>
          {affected.map((pair) => (
            <span
              key={pair}
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold border",
                isImminent
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  : "border-border bg-muted/40 text-muted-foreground"
              )}
            >
              {pair}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### Why this was written this way:
- **Disciplinary Risk Window:** When high-impact news is within 30 minutes, the HUD lights up with an urgent "NO-TRADE ZONE ACTIVE" badge, enforcing the system's rule of protecting capital against spread spikes and slippage.
- **Affected Instruments Display:** Traders can instantly verify whether their active or pending trade pairs (e.g. `XAU/USD`, `EUR/USD`) are exposed to the upcoming release.

---

### 3. Create Weekly Macro Metrics Summary Strip (`components/calendar/CalendarMetricsSummary.tsx`)
Create a high-level summary bar showing macro event distribution and primary volatility catalysts.

**File:** `components/calendar/CalendarMetricsSummary.tsx`
```tsx
"use client";

import { useMemo } from "react";
import { CalendarDays, AlertTriangle, Zap, ShieldAlert } from "lucide-react";
import type { EconomicEvent } from "@/types/calendar";
import { calculateCalendarWeeklyMetrics } from "@/lib/calendar";

interface CalendarMetricsSummaryProps {
  events: EconomicEvent[];
}

export function CalendarMetricsSummary({ events }: CalendarMetricsSummaryProps) {
  const metrics = useMemo(() => calculateCalendarWeeklyMetrics(events), [events]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {/* Total Events */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
          <CalendarDays className="h-3.5 w-3.5" />
          <span className="text-[11px] font-medium uppercase tracking-wider">Total Releases</span>
        </div>
        <p className="text-xl font-bold font-mono">{metrics.totalEvents}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Tracked this week</p>
      </div>

      {/* High-Impact Catalysts */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-1.5 text-rose-500 mb-1">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span className="text-[11px] font-medium uppercase tracking-wider">High Impact</span>
        </div>
        <p className="text-xl font-bold font-mono text-rose-500">{metrics.highImpactCount}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Tier 1 market movers</p>
      </div>

      {/* Primary Currency Driver */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-1.5 text-primary mb-1">
          <Zap className="h-3.5 w-3.5" />
          <span className="text-[11px] font-medium uppercase tracking-wider">Main Driver</span>
        </div>
        <p className="text-xl font-bold font-mono">{metrics.primaryCurrency}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{metrics.primaryCurrencyCount} scheduled releases</p>
      </div>

      {/* Medium Impact */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-1.5 text-amber-500 mb-1">
          <ShieldAlert className="h-3.5 w-3.5" />
          <span className="text-[11px] font-medium uppercase tracking-wider">Medium Impact</span>
        </div>
        <p className="text-xl font-bold font-mono text-amber-500">{metrics.mediumImpactCount}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Secondary catalysts</p>
      </div>
    </div>
  );
}
```

---

### 4. Create Calendar Filter Toolbar (`components/calendar/CalendarFilterToolbar.tsx`)
Create a client toolbar supporting currency pills, impact selection, and title search.

**File:** `components/calendar/CalendarFilterToolbar.tsx`
```tsx
"use client";

import { Search } from "lucide-react";
import type { EventImpact } from "@/types/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

        {/* Search Input */}
        <div className="relative w-full sm:w-60">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search CPI, NFP, GDP..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Currency Filter Pills */}
      <div className="flex flex-wrap items-center gap-1 pt-2 border-t border-border/50">
        <span className="text-[11px] font-medium text-muted-foreground mr-1">Currency:</span>
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
```

---

### 5. Create Calendar Console (`components/calendar/CalendarConsole.tsx`)
Coordinate the live countdown radar, metrics strip, filter toolbar, and group day listings.

**File:** `components/calendar/CalendarConsole.tsx`
```tsx
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
}

export function CalendarConsole({ events }: CalendarConsoleProps) {
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
```

---

### 6. Upgrade Calendar Page (`app/(dashboard)/calendar/page.tsx`)
Update the root server page to fetch events and render the `CalendarConsole`.

**File:** `app/(dashboard)/calendar/page.tsx`
```tsx
import { Calendar } from "lucide-react";
import { getEconomicEvents } from "@/lib/services/calendar";
import { CalendarConsole } from "@/components/calendar/CalendarConsole";

export default async function CalendarPage() {
  const events = await getEconomicEvents();

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Macroeconomic Calendar & Volatility Radar
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track high-impact news catalysts, respect no-trade release windows, and monitor currency events in PHT.
          </p>
        </div>
      </div>

      <CalendarConsole events={events} />
    </div>
  );
}
```

---

## 🧪 Verification & Testing
1. Navigate to `http://localhost:3000/calendar` in your browser.
2. Verify that the **Next High-Impact Catalyst** countdown banner renders at the top with live remaining time and affected instrument tags.
3. Test the **Weekly Macro Metrics** summary strip showing total releases and high-impact counts.
4. Test the **Calendar Filter Toolbar**:
   - Filter by specific currencies (e.g. click `USD` or `EUR`) and verify that only matching rows appear.
   - Filter by impact (`High Only`) to see high-volatility catalysts.
   - Type in the search box (e.g. `"CPI"` or `"Payrolls"`) to verify instant client-side filtering.

