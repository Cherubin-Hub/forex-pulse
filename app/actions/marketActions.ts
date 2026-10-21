"use server";
import { requireUserId } from "@/lib/auth/user";
import { getQuotes } from "@/lib/services/marketData";
import {
  getFinnhubApiKey,
  verifyFinnhubConnection,
} from "@/lib/services/finnhub";
import { verifyYahooConnection } from "@/lib/services/yahooFinance";
import type { PriceQuote } from "@/types/market";

export async function getMarketSnapshotAction(): Promise<PriceQuote[]> {
  await requireUserId();
  return getQuotes();
}

export async function getFeedConfigurationAction(): Promise<{
  configured: boolean;
  provider: "YAHOO" | "FINNHUB" | "NONE";
}> {
  await requireUserId();
  const yahooActive = await verifyYahooConnection();
  if (yahooActive) {
    return { configured: true, provider: "YAHOO" };
  }
  const hasFinnhub = Boolean(getFinnhubApiKey());
  return {
    configured: hasFinnhub,
    provider: hasFinnhub ? "FINNHUB" : "NONE",
  };
}

export async function testMarketFeedAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  await requireUserId();
  const yahooSuccess = await verifyYahooConnection();
  if (yahooSuccess) {
    return { success: true };
  }
  const finnhubSuccess = await verifyFinnhubConnection();
  return {
    success: finnhubSuccess,
    error: finnhubSuccess
      ? undefined
      : "Market candles could not be fetched. Check your internet connection.",
  };
}
