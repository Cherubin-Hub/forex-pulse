import type { PriceQuote } from "@/types/market";
import { MOCK_QUOTES } from "@/lib/mock/quotes";
import { getFinnhubApiKey, getFinnhubQuotes } from "@/lib/services/finnhub";

/**
 * Single entry point for market prices.
 * The UI only calls these functions — it never knows the data source.
 * When FINNHUB_API_KEY is configured, queries real-world live Forex quotes.
 * Falls back to deterministic mock datasets when offline or unconfigured.
 */
export async function getQuotes(): Promise<PriceQuote[]> {
  if (getFinnhubApiKey()) {
    try {
      const live = await getFinnhubQuotes();
      if (live && live.length > 0) return live;
    } catch {
      // Fallback to mock on network error
    }
  }
  return MOCK_QUOTES;
}

export async function getQuote(symbol: string): Promise<PriceQuote | null> {
  const quotes = await getQuotes();
  return quotes.find((quote) => quote.symbol === symbol) ?? null;
}
