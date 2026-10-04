import type { SessionDefinition, SessionStatus } from "@/types/session";
import { FOREX_WEEK_BOUNDARY_HOUR, FOREX_WEEK_TIME_ZONE } from "@/lib/constants/sessions";

type ZonedParts = {
  year: number;
  month: number;   // 1-12
  day: number;
  hour: number;    // 0-23
  minute: number;
  second: number;
  weekday: number; // 0 = Sunday ... 6 = Saturday
};

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

// Creating Intl formatters is relatively expensive, so we cache one per time zone.
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

/** What does the wall clock read in `timeZone` at this exact moment? */
export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = getFormatter(timeZone).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
    weekday: WEEKDAY_INDEX[get("weekday")],
  };
}

/** How far ahead of UTC is `timeZone` at this moment? (in ms, DST-aware) */
function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const p = getZonedParts(date, timeZone);
  const wallClockAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const actualUtc = Math.floor(date.getTime() / 1000) * 1000;
  return wallClockAsUtc - actualUtc;
}

/** Convert "08:00 on this date in London" into a real Date (exact moment). */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  timeZone: string
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour));
  const offset = getTimeZoneOffsetMs(guess, timeZone);
  return new Date(guess.getTime() - offset);
}

export function getSessionStatus(session: SessionDefinition, now: Date): SessionStatus {
  const today = getZonedParts(now, session.timeZone);
  const nowMs = now.getTime();

  // Check today, then the following days, until we find a weekday session that hasn't closed yet.
  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const day = today.day + dayOffset; // Date.UTC handles overflow, e.g. day 32 -> next month
    const opensAt = zonedTimeToUtc(today.year, today.month, day, session.openHour, session.timeZone);
    const closesAt = zonedTimeToUtc(today.year, today.month, day, session.closeHour, session.timeZone);

    const localWeekday = getZonedParts(opensAt, session.timeZone).weekday;
    const isWeekend = localWeekday === 0 || localWeekday === 6;
    if (isWeekend) continue;

    if (nowMs < closesAt.getTime()) {
      const isOpen = nowMs >= opensAt.getTime();
      const duration = closesAt.getTime() - opensAt.getTime();

      return {
        session,
        isOpen,
        opensAt,
        closesAt,
        progress: isOpen ? (nowMs - opensAt.getTime()) / duration : 0,
        msUntilChange: isOpen ? closesAt.getTime() - nowMs : opensAt.getTime() - nowMs,
      };
    }
  }

  throw new Error(`Could not resolve next window for session ${session.id}`);
}

export function isForexMarketOpen(now: Date): boolean {
  const { weekday, hour } = getZonedParts(now, FOREX_WEEK_TIME_ZONE);

  if (weekday === 6) return false;                               // Saturday: closed
  if (weekday === 0) return hour >= FOREX_WEEK_BOUNDARY_HOUR;    // Sunday: opens 17:00 NY
  if (weekday === 5) return hour < FOREX_WEEK_BOUNDARY_HOUR;     // Friday: closes 17:00 NY
  return true;
}

export function getActiveOverlap(statuses: SessionStatus[]): string | null {
  const open = new Set(statuses.filter((s) => s.isOpen).map((s) => s.session.id));

  if (open.has("LONDON") && open.has("NEW_YORK")) return "London / New York overlap";
  if (open.has("ASIAN") && open.has("LONDON")) return "Asian / London overlap";
  return null;
}
