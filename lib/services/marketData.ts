import { MOCK_QUOTES } from "@/lib/mock/quotes";
import { isDemoMode } from "@/lib/marketQuality";
import { getFinnhubQuotes } from "@/lib/services/finnhub";
import type { PriceQuote } from "@/types/market";
export async function getQuotes(): Promise<PriceQuote[]> {
  return isDemoMode() ? MOCK_QUOTES : getFinnhubQuotes();
}
export async function getQuote(symbol: string): Promise<PriceQuote | null> {
  return (await getQuotes()).find((quote) => quote.symbol === symbol) ?? null;
}
