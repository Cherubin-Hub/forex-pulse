import "server-only";
import type { PriceQuote } from "@/types/market";
import type {
  IndicatorData,
  TechnicalAnalysis,
  TrendDirection,
} from "@/types/technical";
import type { CandleSeries } from "@/types/feed";
import { INSTRUMENTS } from "@/lib/constants/instruments";
import { candleResponseSchema } from "@/lib/schemas/feed";
import { buildIndicators, aggregateFourHourCandles } from "@/lib/indicators";

export const SYMBOL_MAP_TO_FINNHUB: Record<string, string> = {
  EURUSD: "OANDA:EUR_USD",
  GBPUSD: "OANDA:GBP_USD",
  USDJPY: "OANDA:USD_JPY",
  AUDUSD: "OANDA:AUD_USD",
  NZDUSD: "OANDA:NZD_USD",
  USDCAD: "OANDA:USD_CAD",
  USDCHF: "OANDA:USD_CHF",
  XAUUSD: "OANDA:XAU_USD",
};
export function getFinnhubApiKey(): string | null {
  return process.env.FINNHUB_API_KEY?.trim() || null;
}
export async function fetchFinnhubCandles(
  symbol: string,
  resolution: "1" | "15" | "60" | "D",
  count = 250,
): Promise<CandleSeries | null> {
  const apiKey = getFinnhubApiKey();
  if (!apiKey || !SYMBOL_MAP_TO_FINNHUB[symbol]) return null;
  const now = Math.floor(Date.now() / 60000) * 60;
  const seconds = resolution === "D" ? 86400 : Number(resolution) * 60;
  const url = new URL("https://finnhub.io/api/v1/forex/candle");
  url.search = new URLSearchParams({
    symbol: SYMBOL_MAP_TO_FINNHUB[symbol],
    resolution,
    from: String(now - Math.max(seconds * count * 2, 3 * 86400)),
    to: String(now),
    token: apiKey,
  }).toString();
  try {
    const response = await fetch(url, {
      next: { revalidate: resolution === "1" ? 15 : 60 },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    const parsed = candleResponseSchema.safeParse(await response.json());
    if (!parsed.success) return null;
    const { c, h, l, o, t } = parsed.data;
    return { closes: c, highs: h, lows: l, opens: o, times: t };
  } catch {
    return null;
  }
}
export function unavailableQuotes(): PriceQuote[] {
  return INSTRUMENTS.map((instrument) => ({
    symbol: instrument.symbol,
    price: null,
    previousClose: null,
    high: null,
    low: null,
    bias: "NEUTRAL",
    sparkline: [],
    timestamp: new Date(0).toISOString(),
    source: "Unavailable",
    delayMinutes: 0,
    status: "UNAVAILABLE",
  }));
}
export async function getFinnhubQuotes(): Promise<PriceQuote[]> {
  const empty = unavailableQuotes();
  return Promise.all(
    empty.map(async (quote) => {
      const [minute, daily] = await Promise.all([
        fetchFinnhubCandles(quote.symbol, "1", 30),
        fetchFinnhubCandles(quote.symbol, "D", 5),
      ]);
      if (!minute) return quote;
      const index = minute.closes.length - 1;
      const timestamp = new Date(minute.times[index] * 1000).toISOString();
      const age = Date.now() - Date.parse(timestamp);
      const price = minute.closes[index];
      const previousClose =
        daily && daily.closes.length >= 2
          ? daily.closes[daily.closes.length - 2]
          : null;
      return {
        ...quote,
        price,
        previousClose,
        previousHigh:
          daily && daily.highs.length >= 2
            ? daily.highs[daily.highs.length - 2]
            : null,
        previousLow:
          daily && daily.lows.length >= 2
            ? daily.lows[daily.lows.length - 2]
            : null,
        high: daily?.highs.at(-1) ?? null,
        low: daily?.lows.at(-1) ?? null,
        bias:
          previousClose === null
            ? ("NEUTRAL" as const)
            : price > previousClose
              ? ("BULLISH" as const)
              : price < previousClose
                ? ("BEARISH" as const)
                : ("NEUTRAL" as const),
        sparkline: minute.closes.slice(-30),
        timestamp,
        source: "FINNHUB_CANDLES",
        status:
          age >= -5000 && age <= 120000
            ? ("LIVE" as const)
            : ("DELAYED" as const),
        delayMinutes: Math.max(0, Math.ceil(age / 60000)),
      };
    }),
  );
}
export async function getFinnhubTechnicalAnalysis(): Promise<
  TechnicalAnalysis[]
> {
  const results = await Promise.all(
    INSTRUMENTS.map(async (instrument): Promise<TechnicalAnalysis | null> => {
      const [m15, hourly, daily] = await Promise.all([
        fetchFinnhubCandles(instrument.symbol, "15", 250),
        fetchFinnhubCandles(instrument.symbol, "60", 1000),
        fetchFinnhubCandles(instrument.symbol, "D", 250),
      ]);
      if (!m15 || !hourly || !daily) return null;
      const h4 = aggregateFourHourCandles(hourly);
      const multiplier =
        instrument.decimals === 2
          ? 10
          : instrument.decimals === 3
            ? 100
            : 10000;
      const timeframes: Record<string, IndicatorData | null> = {
        D1: buildIndicators(daily, multiplier, 86400),
        H4: buildIndicators(h4, multiplier, 14400),
        H1: buildIndicators(hourly, multiplier, 3600),
        M15: buildIndicators(m15, multiplier, 900),
      };
      if (!timeframes.D1 || !timeframes.H4 || !timeframes.H1 || !timeframes.M15)
        return null;
      const trends = Object.values(timeframes).map((value) => value!.emaTrend);
      const overallBias: TrendDirection =
        trends.filter((value) => value === "BULLISH").length >= 3
          ? "BULLISH"
          : trends.filter((value) => value === "BEARISH").length >= 3
            ? "BEARISH"
            : "NEUTRAL";
      return {
        symbol: instrument.symbol,
        timeframes: {
          D1: timeframes.D1,
          H4: timeframes.H4,
          H1: timeframes.H1,
          M15: timeframes.M15,
        },
        overallBias,
        status: "LIVE",
        timestamp: new Date(m15.times.at(-1)! * 1000).toISOString(),
      };
    }),
  );
  return results.filter((value): value is TechnicalAnalysis => value !== null);
}
export async function verifyFinnhubConnection(): Promise<boolean> {
  const sample = await fetchFinnhubCandles("EURUSD", "1", 2);
  return Boolean(sample && sample.closes.length > 0);
}
