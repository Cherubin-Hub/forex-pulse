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
    actual: null,
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
    actual: null,
    source: MOCK_SOURCE,
    status: "LIVE",
  },
  {
    id: "evt-gbp-gdp",
    title: "GDP m/m",
    currency: "GBP",
    impact: "MEDIUM",
    scheduledAt: getRelativePHTTimestamp(1, 14, 0),
    forecast: "0.1%",
    previous: "0.0%",
    actual: null,
    source: MOCK_SOURCE,
    status: "LIVE",
  },
  {
    id: "evt-usd-cpi",
    title: "CPI m/m",
    currency: "USD",
    impact: "HIGH",
    scheduledAt: getRelativePHTTimestamp(1, 20, 30),
    forecast: "0.3%",
    previous: "0.4%",
    actual: null,
    source: MOCK_SOURCE,
    status: "LIVE",
  },
  {
    id: "evt-usd-claims",
    title: "Unemployment Claims",
    currency: "USD",
    impact: "MEDIUM",
    scheduledAt: getRelativePHTTimestamp(2, 20, 30),
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
    scheduledAt: getRelativePHTTimestamp(3, 20, 30),
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
    scheduledAt: getRelativePHTTimestamp(3, 20, 30),
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
    scheduledAt: getRelativePHTTimestamp(3, 20, 30),
    forecast: "20.0K",
    previous: "22.1K",
    actual: null,
    source: MOCK_SOURCE,
    status: "LIVE",
  },
];
