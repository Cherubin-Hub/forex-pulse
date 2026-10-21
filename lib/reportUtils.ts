import { MARKET_SESSIONS } from "@/lib/constants/sessions";
import { getZonedParts, zonedTimeToUtc } from "@/lib/sessions";
import type { SessionType } from "@/types/report";
const mapping: Record<SessionType, string> = {
  ASIAN_WRAP: "ASIAN",
  LONDON_OPEN: "LONDON",
  NEW_YORK_OPEN: "NEW_YORK",
};
export function getSessionWindow(session: SessionType, now = new Date()): Date {
  const definition = MARKET_SESSIONS.find(
    (value) => value.id === mapping[session],
  )!;
  const date = getZonedParts(now, definition.timeZone);
  const hour =
    session === "ASIAN_WRAP" ? definition.closeHour : definition.openHour;
  for (let offset = 0; offset >= -7; offset--) {
    const window = zonedTimeToUtc(
      date.year,
      date.month,
      date.day + offset,
      hour,
      definition.timeZone,
    );
    if (
      window <= now &&
      ![0, 6].includes(getZonedParts(window, definition.timeZone).weekday)
    )
      return window;
  }
  throw new Error("Session window unavailable.");
}
export function getCurrentSessionWindow(now = new Date()): {
  session: SessionType;
  windowStart: Date;
} {
  const windows = (Object.keys(mapping) as SessionType[]).map((session) => ({
    session,
    windowStart: getSessionWindow(session, now),
  }));
  windows.sort((a, b) => b.windowStart.getTime() - a.windowStart.getTime());
  return windows[0];
}
