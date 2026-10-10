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
