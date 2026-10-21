import { MOCK_QUOTES } from "@/lib/mock/quotes";
import { isDemoMode } from "@/lib/marketQuality";
import { getFinnhubQuotes } from "@/lib/services/finnhub";
import { getYahooQuotes } from "@/lib/services/yahooFinance";
import type { PriceQuote } from "@/types/market";

export async function getQuotes(): Promise<PriceQuote[]> {
  if (isDemoMode()) return MOCK_QUOTES;

  try {
    const yahooQuotes = await getYahooQuotes();
    const hasValidQuotes = yahooQuotes.some(
      (quote) =>
        (quote.status === "LIVE" || quote.status === "DELAYED") &&
        quote.price !== null,
    );
    if (hasValidQuotes) {
      return yahooQuotes;
    }
  } catch {
    // Fallback to Finnhub if Yahoo fails
  }

  return getFinnhubQuotes();
}

export async function getQuote(symbol: string): Promise<PriceQuote | null> {
  return (await getQuotes()).find((quote) => quote.symbol === symbol) ?? null;
}
