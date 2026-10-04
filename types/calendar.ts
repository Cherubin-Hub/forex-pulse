import type { DataStatus } from "@/types/market";

export type EventImpact = "HIGH" | "MEDIUM" | "LOW";

export type EconomicEvent = {
  id: string;
  title: string;            // "Non-Farm Payrolls"
  currency: string;         // "USD"
  impact: EventImpact;
  scheduledAt: string;      // ISO 8601 — exact release moment
  forecast: string | null;  // "150K", "0.3%"
  previous: string | null;
  actual: string | null;    // null until released
  source: string;
  status: DataStatus;
};

export type EventTiming =
  | "UPCOMING"       // more than 30 min away
  | "IMMINENT"       // within 30 min — risk window
  | "JUST_RELEASED"  // released less than 15 min ago — volatility window
  | "RELEASED";      // older
  