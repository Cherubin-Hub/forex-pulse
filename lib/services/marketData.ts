import type { PriceQuote } from "@/types/market";
import { MOCK_QUOTES } from "@/lib/mock/quotes";

/**
 * Single entry point for market prices.
 * The UI only calls these functions — it never knows the data source.
 * Phase 1 later: replace MOCK_QUOTES with a real provider here.
 */
export async function getQuotes(): Promise<PriceQuote[]> {
  return MOCK_QUOTES;
}

export async function getQuote(symbol: string): Promise<PriceQuote | null> {
  const quotes = await getQuotes();
  return quotes.find((quote) => quote.symbol === symbol) ?? null;
}
