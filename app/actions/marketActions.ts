"use server";
import { requireUserId } from "@/lib/auth/user";
import { getQuotes } from "@/lib/services/marketData";
import {
  getFinnhubApiKey,
  verifyFinnhubConnection,
} from "@/lib/services/finnhub";
import type { PriceQuote } from "@/types/market";
export async function getMarketSnapshotAction(): Promise<PriceQuote[]> {
  await requireUserId();
  return getQuotes();
}
export async function getFeedConfigurationAction(): Promise<{
  configured: boolean;
}> {
  await requireUserId();
  return { configured: Boolean(getFinnhubApiKey()) };
}
export async function testMarketFeedAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  await requireUserId();
  const success = await verifyFinnhubConnection();
  return {
    success,
    error: success
      ? undefined
      : "Forex candles were not returned. Check FINNHUB_API_KEY and your provider subscription.",
  };
}
