import type { PriceQuote } from "@/types/market";

export function isVerifiedQuote(
  quote: PriceQuote | null | undefined,
  now = Date.now(),
): quote is PriceQuote & { price: number } {
  if (
    !quote ||
    quote.status !== "LIVE" ||
    !Number.isFinite(quote.price) ||
    (quote.price ?? 0) <= 0
  )
    return false;
  const age = now - Date.parse(quote.timestamp);
  return Number.isFinite(age) && age >= -5000 && age <= 120_000;
}

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export function ageQuotes(
  quotes: PriceQuote[],
  now = Date.now(),
): PriceQuote[] {
  let changed = false;
  const next = quotes.map((quote) => {
    if (quote.status !== "LIVE" || isVerifiedQuote(quote, now)) return quote;
    changed = true;
    return {
      ...quote,
      status: "DELAYED" as const,
      delayMinutes: Math.max(
        0,
        Math.ceil((now - Date.parse(quote.timestamp)) / 60000),
      ),
    };
  });
  return changed ? next : quotes;
}
