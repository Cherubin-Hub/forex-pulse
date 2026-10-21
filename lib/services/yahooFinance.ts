import "server-only";
import type { PriceQuote } from "@/types/market";
import type {
  IndicatorData,
  TechnicalAnalysis,
  TrendDirection,
} from "@/types/technical";
import type { CandleSeries } from "@/types/feed";
import { INSTRUMENTS } from "@/lib/constants/instruments";
import { buildIndicators, aggregateFourHourCandles } from "@/lib/indicators";

export const SYMBOL_MAP_TO_YAHOO: Record<string, string> = {
  EURUSD: "EURUSD=X",
  GBPUSD: "GBPUSD=X",
  USDJPY: "USDJPY=X",
  AUDUSD: "AUDUSD=X",
  NZDUSD: "NZDUSD=X",
  USDCAD: "USDCAD=X",
  USDCHF: "USDCHF=X",
  XAUUSD: "GC=F",
};

const RESOLUTION_CONFIG: Record<
  "1" | "15" | "60" | "D",
  { interval: string; range: string; revalidate: number }
> = {
  "1": { interval: "1m", range: "1d", revalidate: 15 },
  "15": { interval: "15m", range: "1mo", revalidate: 60 },
  "60": { interval: "60m", range: "3mo", revalidate: 300 },
  D: { interval: "1d", range: "2y", revalidate: 900 },
};

export async function fetchYahooCandles(
  symbol: string,
  resolution: "1" | "15" | "60" | "D",
): Promise<CandleSeries | null> {
  const yahooSymbol = SYMBOL_MAP_TO_YAHOO[symbol];
  if (!yahooSymbol) return null;

  const config = RESOLUTION_CONFIG[resolution];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    yahooSymbol,
  )}?interval=${config.interval}&range=${config.range}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: config.revalidate },
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });

    if (!response.ok) return null;

    const json = (await response.json()) as {
      chart?: {
        result?: Array<{
          timestamp?: number[];
          indicators?: {
            quote?: Array<{
              open?: (number | null)[];
              high?: (number | null)[];
              low?: (number | null)[];
              close?: (number | null)[];
            }>;
          };
        }>;
      };
    };

    const result = json.chart?.result?.[0];
    const timestamps = result?.timestamp;
    const quotes = result?.indicators?.quote?.[0];

    if (!timestamps || !quotes || !quotes.close) return null;

    const series: CandleSeries = {
      times: [],
      opens: [],
      highs: [],
      lows: [],
      closes: [],
    };

    let lastTime = 0;
    for (let i = 0; i < timestamps.length; i++) {
      const time = timestamps[i];
      const o = quotes.open?.[i];
      const h = quotes.high?.[i];
      const l = quotes.low?.[i];
      const c = quotes.close?.[i];

      if (
        time > lastTime &&
        o !== null &&
        o !== undefined &&
        h !== null &&
        h !== undefined &&
        l !== null &&
        l !== undefined &&
        c !== null &&
        c !== undefined &&
        Number.isFinite(o) &&
        Number.isFinite(h) &&
        Number.isFinite(l) &&
        Number.isFinite(c) &&
        o > 0 &&
        h > 0 &&
        l > 0 &&
        c > 0
      ) {
        series.times.push(time);
        series.opens.push(o);
        series.highs.push(Math.max(h, o, c));
        series.lows.push(Math.min(l, o, c));
        series.closes.push(c);
        lastTime = time;
      }
    }

    return series.closes.length > 0 ? series : null;
  } catch {
    return null;
  }
}

export async function getYahooQuotes(): Promise<PriceQuote[]> {
  return Promise.all(
    INSTRUMENTS.map(async (instrument): Promise<PriceQuote> => {
      const fallbackQuote: PriceQuote = {
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
      };

      try {
        const [minute, daily] = await Promise.all([
          fetchYahooCandles(instrument.symbol, "1"),
          fetchYahooCandles(instrument.symbol, "D"),
        ]);

        if (!minute || minute.closes.length === 0) return fallbackQuote;

        const index = minute.closes.length - 1;
        const timestamp = new Date(minute.times[index] * 1000).toISOString();
        const age = Date.now() - Date.parse(timestamp);
        const price = minute.closes[index];

        const previousClose =
          daily && daily.closes.length >= 2
            ? daily.closes[daily.closes.length - 2]
            : null;

        const bias =
          previousClose === null
            ? "NEUTRAL"
            : price > previousClose
              ? "BULLISH"
              : price < previousClose
                ? "BEARISH"
                : "NEUTRAL";

        const sparkline = minute.closes.slice(-30);

        return {
          symbol: instrument.symbol,
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
          bias,
          sparkline,
          timestamp,
          source: "YAHOO_FINANCE",
          status: age >= -5000 && age <= 180000 ? "LIVE" : "DELAYED",
          delayMinutes: Math.max(0, Math.ceil(age / 60000)),
        };
      } catch {
        return fallbackQuote;
      }
    }),
  );
}

export async function getYahooTechnicalAnalysis(): Promise<
  TechnicalAnalysis[]
> {
  const results = await Promise.all(
    INSTRUMENTS.map(async (instrument): Promise<TechnicalAnalysis | null> => {
      try {
        const [m15, hourly, daily] = await Promise.all([
          fetchYahooCandles(instrument.symbol, "15"),
          fetchYahooCandles(instrument.symbol, "60"),
          fetchYahooCandles(instrument.symbol, "D"),
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

        if (
          !timeframes.D1 ||
          !timeframes.H4 ||
          !timeframes.H1 ||
          !timeframes.M15
        ) {
          return null;
        }

        const trends = Object.values(timeframes).map(
          (value) => value!.emaTrend,
        );
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
      } catch {
        return null;
      }
    }),
  );

  return results.filter((value): value is TechnicalAnalysis => value !== null);
}

export async function verifyYahooConnection(): Promise<boolean> {
  try {
    const sample = await fetchYahooCandles("EURUSD", "1");
    return Boolean(sample && sample.closes.length > 0);
  } catch {
    return false;
  }
}
