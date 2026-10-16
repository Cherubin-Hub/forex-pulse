import type { EconomicEvent } from "@/types/calendar";

const MOCK_SOURCE = "Global Macro";

/**
 * Generates an ISO timestamp in PHT (+08:00) with a relative day offset from today.
 * Ensures mock calendar data is always active and within the current trading week.
 */
function getRelativePHTTimestamp(dayOffset: number, hours: number, minutes = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `${year}-${month}-${day}T${pad(hours)}:${pad(minutes)}:00+08:00`;
}

/**
 * Deterministic institutional release profiles for macroeconomic catalysts.
 * Defines realistic actual values, market surprise direction, and contextual headlines.
 */
export const EVENT_RELEASE_RESOLUTIONS: Record<
  string,
  {
    actual: string;
    bias: "BEAT" | "MISS" | "IN_LINE";
    headline: string;
  }
> = {
  "evt-usd-ism-services": {
    actual: "52.1",
    bias: "BEAT",
    headline: "ISM Services PMI beats expectations, signaling resilient US service sector expansion.",
  },
  "evt-aud-rba-decision": {
    actual: "3.60%",
    bias: "IN_LINE",
    headline: "RBA maintains cash rate at 3.60% as inflation moderates within forecast band.",
  },
  "evt-eur-german-ip": {
    actual: "-0.1%",
    bias: "MISS",
    headline: "German Industrial Production contracts -0.1%, trailing the +0.2% consensus forecast.",
  },
  "evt-usd-fomc-minutes": {
    actual: "Hawkish Pause",
    bias: "BEAT",
    headline: "FOMC Minutes signal policymakers prefer maintaining higher rates for longer.",
  },
  "evt-gbp-gdp": {
    actual: "0.2%",
    bias: "BEAT",
    headline: "UK Monthly GDP expands 0.2%, exceeding the 0.1% forecast led by services output.",
  },
  "evt-usd-cpi": {
    actual: "0.4%",
    bias: "BEAT",
    headline: "US CPI rises 0.4% MoM vs 0.3% expected, driven by shelter and energy inflation.",
  },
  "evt-usd-claims": {
    actual: "218K",
    bias: "BEAT",
    headline: "US Initial Jobless Claims drop to 218K vs 225K forecast, labor market holds tight.",
  },
  "evt-usd-nfp": {
    actual: "165K",
    bias: "BEAT",
    headline: "US Non-Farm Payrolls surge by 165K vs 150K estimate, affirming labor strength.",
  },
  "evt-usd-unemployment": {
    actual: "4.1%",
    bias: "BEAT",
    headline: "US Unemployment Rate dips to 4.1% vs 4.2% expected.",
  },
  "evt-cad-employment": {
    actual: "24.5K",
    bias: "BEAT",
    headline: "Canada Employment Change adds 24.5K net jobs vs 20.0K forecast.",
  },
};

export const MOCK_EVENTS: EconomicEvent[] = [
  {
    id: "evt-usd-ism-services",
    title: "ISM Services PMI",
    currency: "USD",
    impact: "HIGH",
    scheduledAt: getRelativePHTTimestamp(-2, 22, 0),
    forecast: "51.7",
    previous: "51.5",
    actual: "52.1",
    source: MOCK_SOURCE,
    status: "LIVE",
  },
  {
    id: "evt-aud-rba-decision",
    title: "RBA Cash Rate Decision",
    currency: "AUD",
    impact: "HIGH",
    scheduledAt: getRelativePHTTimestamp(-1, 12, 30),
    forecast: "3.60%",
    previous: "3.60%",
    actual: "3.60%",
    source: MOCK_SOURCE,
    status: "LIVE",
  },
  {
    id: "evt-eur-german-ip",
    title: "German Industrial Production m/m",
    currency: "EUR",
    impact: "LOW",
    scheduledAt: getRelativePHTTimestamp(0, 14, 0),
    forecast: "0.2%",
    previous: "-0.4%",
    actual: "-0.1%",
    source: MOCK_SOURCE,
    status: "LIVE",
  },
  {
    id: "evt-usd-fomc-minutes",
    title: "FOMC Meeting Minutes",
    currency: "USD",
    impact: "HIGH",
    scheduledAt: getRelativePHTTimestamp(0, 20, 30),
    forecast: null,
    previous: null,
    actual: "Hawkish Pause",
    source: MOCK_SOURCE,
    status: "LIVE",
  },
  {
    id: "evt-gbp-gdp",
    title: "GDP m/m",
    currency: "GBP",
    impact: "MEDIUM",
    scheduledAt: getRelativePHTTimestamp(0, 14, 0),
    forecast: "0.1%",
    previous: "0.0%",
    actual: "0.2%",
    source: MOCK_SOURCE,
    status: "LIVE",
  },
  {
    id: "evt-usd-cpi",
    title: "CPI m/m",
    currency: "USD",
    impact: "HIGH",
    scheduledAt: getRelativePHTTimestamp(0, 20, 30),
    forecast: "0.3%",
    previous: "0.4%",
    actual: "0.4%",
    source: MOCK_SOURCE,
    status: "LIVE",
  },
  {
    id: "evt-usd-claims",
    title: "Unemployment Claims",
    currency: "USD",
    impact: "MEDIUM",
    scheduledAt: getRelativePHTTimestamp(1, 20, 30),
    forecast: "225K",
    previous: "219K",
    actual: null,
    source: MOCK_SOURCE,
    status: "LIVE",
  },
  {
    id: "evt-usd-nfp",
    title: "Non-Farm Payrolls",
    currency: "USD",
    impact: "HIGH",
    scheduledAt: getRelativePHTTimestamp(2, 20, 30),
    forecast: "150K",
    previous: "142K",
    actual: null,
    source: MOCK_SOURCE,
    status: "LIVE",
  },
  {
    id: "evt-usd-unemployment",
    title: "Unemployment Rate",
    currency: "USD",
    impact: "HIGH",
    scheduledAt: getRelativePHTTimestamp(2, 20, 30),
    forecast: "4.2%",
    previous: "4.2%",
    actual: null,
    source: MOCK_SOURCE,
    status: "LIVE",
  },
  {
    id: "evt-cad-employment",
    title: "Employment Change",
    currency: "CAD",
    impact: "HIGH",
    scheduledAt: getRelativePHTTimestamp(2, 20, 30),
    forecast: "20.0K",
    previous: "22.1K",
    actual: null,
    source: MOCK_SOURCE,
    status: "LIVE",
  },
];

/**
 * Resolves or auto-populates the actual value of an economic event if its scheduled release time has elapsed.
 */
export function resolveEventActual(event: EconomicEvent, now = new Date()): EconomicEvent {
  const isPast = new Date(event.scheduledAt).getTime() <= now.getTime();
  if (isPast && (!event.actual || event.actual === "—")) {
    const resolution = EVENT_RELEASE_RESOLUTIONS[event.id];
    return {
      ...event,
      actual: resolution?.actual ?? (event.forecast ?? event.previous ?? "Released"),
    };
  }
  return event;
}
