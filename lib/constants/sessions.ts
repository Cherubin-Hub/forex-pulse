import type { SessionDefinition } from "@/types/session";

export const MARKET_SESSIONS: SessionDefinition[] = [
  { id: "ASIAN", name: "Asian", city: "Tokyo", timeZone: "Asia/Tokyo", openHour: 9, closeHour: 18 },
  { id: "LONDON", name: "London", city: "London", timeZone: "Europe/London", openHour: 8, closeHour: 17 },
  { id: "NEW_YORK", name: "New York", city: "New York", timeZone: "America/New_York", openHour: 8, closeHour: 17 },
];

// Forex trades from Sunday 17:00 to Friday 17:00 New York time.
export const FOREX_WEEK_TIME_ZONE = "America/New_York";
export const FOREX_WEEK_BOUNDARY_HOUR = 17;

export const USER_TIME_ZONE = "Asia/Manila";
