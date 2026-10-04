import type { EconomicEvent, EventTiming } from "@/types/calendar";
import { NEWS_RISK_WINDOW_MINUTES, POST_RELEASE_WINDOW_MINUTES } from "@/lib/constants/calendar";
import { INSTRUMENTS } from "@/lib/constants/instruments";
import { formatDayKeyPHT, formatDayLabelPHT } from "@/lib/formatters";

const MINUTE_MS = 60_000;

export function getMsUntilEvent(event: EconomicEvent, now: Date): number {
  return new Date(event.scheduledAt).getTime() - now.getTime();
}

export function getEventTiming(event: EconomicEvent, now: Date): EventTiming {
  const msUntil = getMsUntilEvent(event, now);

  if (msUntil > NEWS_RISK_WINDOW_MINUTES * MINUTE_MS) return "UPCOMING";
  if (msUntil > 0) return "IMMINENT";
  if (-msUntil <= POST_RELEASE_WINDOW_MINUTES * MINUTE_MS) return "JUST_RELEASED";
  return "RELEASED";
}

export function getUpcomingEvents(events: EconomicEvent[], now: Date, limit: number): EconomicEvent[] {
  return events.filter((event) => getEventTiming(event, now) !== "RELEASED").slice(0, limit);
}

/** High-impact events inside the risk window (before) or volatility window (after). */
export function getActiveNewsRisks(events: EconomicEvent[], now: Date): EconomicEvent[] {
  return events.filter((event) => {
    if (event.impact !== "HIGH") return false;
    const timing = getEventTiming(event, now);
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
