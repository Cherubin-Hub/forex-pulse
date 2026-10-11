import { INSTRUMENTS } from "@/lib/constants/instruments";
import type { PriceQuote } from "@/types/market";

export type TickDirection = "UP" | "DOWN" | "NEUTRAL";

export type TickerItemData = {
  symbol: string;
  displayName: string;
  price: number | null;
  previousClose: number;
  changePercent: number;
  changePips: number;
  direction: TickDirection;
  spreadPips: number;
  decimals: number;
  category: "MAJOR" | "COMMODITY";
};

// Institutional average spreads in pips
const INSTITUTIONAL_SPREADS: Record<string, number> = {
  EURUSD: 0.8,
  GBPUSD: 1.1,
  USDJPY: 0.9,
  AUDUSD: 0.9,
  NZDUSD: 1.2,
  USDCAD: 1.1,
  USDCHF: 1.0,
  XAUUSD: 2.5,
};

/**
 * Builds structured ticker feed items with pip calculations and directional states.
 */
export function buildTickerFeed(
  quotes: PriceQuote[],
  prevPrices?: Record<string, number>
): TickerItemData[] {
  return INSTRUMENTS.map((inst) => {
    const quote = quotes.find((q) => q.symbol === inst.symbol);
    const price = quote?.price ?? null;
    const previousClose = quote?.previousClose ?? (price ?? 1.0);
    const decimals = inst.decimals;
    const multiplier = decimals === 5 ? 10000 : decimals === 3 ? 100 : 10;

    let changePercent = 0;
    let changePips = 0;
    let direction: TickDirection = "NEUTRAL";

    if (price !== null) {
      const diff = price - previousClose;
      changePercent = previousClose !== 0 ? Number(((diff / previousClose) * 100).toFixed(2)) : 0;
      changePips = Number((diff * multiplier).toFixed(1));

      if (prevPrices && prevPrices[inst.symbol] !== undefined) {
        const lastPrice = prevPrices[inst.symbol];
        if (price > lastPrice) direction = "UP";
        else if (price < lastPrice) direction = "DOWN";
        else direction = "NEUTRAL";
      } else {
        direction = changePercent > 0 ? "UP" : changePercent < 0 ? "DOWN" : "NEUTRAL";
      }
    }

    return {
      symbol: inst.symbol,
      displayName: inst.displayName,
      price,
      previousClose,
      changePercent,
      changePips,
      direction,
      spreadPips: INSTITUTIONAL_SPREADS[inst.symbol] ?? 1.0,
      decimals,
      category: inst.category,
    };
  });
}
