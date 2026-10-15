import type { MarketBias, PriceQuote } from "@/types/market";
import type { IndicatorData, TechnicalAnalysis, TrendDirection } from "@/types/technical";
import { INSTRUMENTS } from "@/lib/constants/instruments";
import { MOCK_QUOTES } from "@/lib/mock/quotes";
import { MOCK_TECHNICALS } from "@/lib/mock/technical";

/**
 * Mapping between internal ForexPulse symbols and Finnhub/OANDA symbol formats.
 */
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

export const SYMBOL_MAP_FROM_FINNHUB: Record<string, string> = Object.entries(
  SYMBOL_MAP_TO_FINNHUB
).reduce((acc, [internal, finnhub]) => {
  acc[finnhub] = internal;
  return acc;
}, {} as Record<string, string>);

/**
 * Resolves the Finnhub API Key from environment variables or browser LocalStorage.
 */
export function getFinnhubApiKey(): string | null {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("fp_finnhub_key");
      if (stored && stored.trim().length > 0) return stored.trim();
    } catch {
      // Ignore localStorage read errors in restricted contexts
    }
  }

  const envKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || process.env.FINNHUB_API_KEY;
  return envKey && envKey.trim().length > 0 ? envKey.trim() : null;
}

/**
 * Calculates Exponential Moving Average (EMA) for an array of prices.
 */
function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] ?? 0;
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((sum, p) => sum + p, 0) / period;

  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return Number(ema.toFixed(5));
}

/**
 * Calculates Relative Strength Index (RSI 14) from closing prices.
 */
function calculateRSI(prices: number[], period = 14): number {
  if (prices.length <= period) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Number((100 - 100 / (1 + rs)).toFixed(1));
}

/**
 * Calculates Average True Range (ATR 14) in pips.
 */
function calculateATR(highs: number[], lows: number[], closes: number[], multiplier: number, period = 14): number {
  if (closes.length <= 1) return 20;

  const trs: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - closes[i - 1]);
    const lc = Math.abs(lows[i] - closes[i - 1]);
    trs.push(Math.max(hl, hc, lc));
  }

  const avgTr = trs.slice(-period).reduce((a, b) => a + b, 0) / Math.min(trs.length, period);
  return Number((avgTr * multiplier).toFixed(1));
}

/**
 * Fetches real candle data from Finnhub REST API for a single instrument and timeframe.
 */
export async function fetchFinnhubCandles(
  symbol: string,
  resolution: "15" | "60" | "D",
  count = 60
): Promise<{ closes: number[]; highs: number[]; lows: number[]; opens: number[] } | null> {
  const apiKey = getFinnhubApiKey();
  if (!apiKey) return null;

  const finnhubSymbol = SYMBOL_MAP_TO_FINNHUB[symbol] || symbol;
  const now = Math.floor(Date.now() / 1000);
  // Estimate lookback window in seconds based on resolution
  const secondsPerBar = resolution === "15" ? 15 * 60 : resolution === "60" ? 60 * 60 : 86400;
  const from = now - secondsPerBar * (count + 20);

  const url = `https://finnhub.io/api/v1/forex/candle?symbol=${encodeURIComponent(
    finnhubSymbol
  )}&resolution=${resolution}&from=${from}&to=${now}&token=${apiKey}`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;

    const data = await res.json();
    if (data.s !== "ok" || !Array.isArray(data.c) || data.c.length === 0) {
      return null;
    }

    return {
      closes: data.c,
      highs: data.h,
      lows: data.l,
      opens: data.o,
    };
  } catch (err) {
    console.warn(`[Finnhub] Failed to fetch candles for ${symbol}:`, err);
    return null;
  }
}

/**
 * Fetches real market quotes from Finnhub for all supported watchlist instruments.
 * Falls back to MOCK_QUOTES if no API key is provided or offline.
 */
export async function getFinnhubQuotes(): Promise<PriceQuote[]> {
  const apiKey = getFinnhubApiKey();
  if (!apiKey) return MOCK_QUOTES;

  try {
    const quotePromises = INSTRUMENTS.map(async (inst) => {
      const finnhubSymbol = SYMBOL_MAP_TO_FINNHUB[inst.symbol] || inst.symbol;
      const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
        finnhubSymbol
      )}&token=${apiKey}`;

      const res = await fetch(url, { next: { revalidate: 15 } });
      if (!res.ok) return null;

      const data = await res.json();
      if (!data || data.c === undefined || data.c === 0) return null;

      const price = Number(data.c.toFixed(inst.decimals));
      const previousClose = data.pc ? Number(data.pc.toFixed(inst.decimals)) : price;
      const bias: MarketBias = price > previousClose ? "BULLISH" : price < previousClose ? "BEARISH" : "NEUTRAL";
      const spread = Math.abs(price - previousClose);

      const quote: PriceQuote = {
        symbol: inst.symbol,
        price,
        previousClose,
        high: data.h ? Number(data.h.toFixed(inst.decimals)) : Math.max(price, previousClose) + spread * 0.4,
        low: data.l ? Number(data.l.toFixed(inst.decimals)) : Math.min(price, previousClose) - spread * 0.4,
        bias,
        sparkline: [previousClose, price],
        timestamp: new Date().toISOString(),
        source: "FINNHUB_REST",
        delayMinutes: 0,
        status: "LIVE",
      };

      return quote;
    });

    const results = await Promise.all(quotePromises);
    const validQuotes = results.filter((q): q is PriceQuote => q !== null);

    if (validQuotes.length === 0) return MOCK_QUOTES;

    // Fill in any instruments that failed with mock fallback
    return INSTRUMENTS.map((inst) => {
      const live = validQuotes.find((v) => v.symbol === inst.symbol);
      return live ?? (MOCK_QUOTES.find((m) => m.symbol === inst.symbol) as PriceQuote);
    });
  } catch (err) {
    console.warn("[Finnhub] REST quotes error, falling back to mock:", err);
    return MOCK_QUOTES;
  }
}

/**
 * Computes live Technical Analysis for an instrument using Finnhub candles.
 */
export async function getFinnhubTechnicalAnalysis(): Promise<TechnicalAnalysis[]> {
  const apiKey = getFinnhubApiKey();
  if (!apiKey) return MOCK_TECHNICALS;

  try {
    const technicalPromises = INSTRUMENTS.map(async (inst) => {
      const multiplier = inst.decimals === 2 ? 10 : inst.decimals === 3 ? 100 : 10000;

      const [m15, h1, d1] = await Promise.all([
        fetchFinnhubCandles(inst.symbol, "15", 50),
        fetchFinnhubCandles(inst.symbol, "60", 60),
        fetchFinnhubCandles(inst.symbol, "D", 60),
      ]);

      if (!h1 || !d1 || h1.closes.length < 20 || d1.closes.length < 20) {
        return MOCK_TECHNICALS.find((t) => t.symbol === inst.symbol) ?? null;
      }

      const buildTf = (candles: { closes: number[]; highs: number[]; lows: number[]; opens: number[] }): IndicatorData => {
        const ema20 = calculateEMA(candles.closes, 20);
        const ema50 = calculateEMA(candles.closes, Math.min(50, candles.closes.length));
        const rsi = calculateRSI(candles.closes, 14);
        const atr = calculateATR(candles.highs, candles.lows, candles.closes, multiplier, 14);
        const lastClose = candles.closes[candles.closes.length - 1];

        const emaTrend: TrendDirection =
          lastClose > ema50 && ema20 > ema50 ? "BULLISH" : lastClose < ema50 && ema20 < ema50 ? "BEARISH" : "NEUTRAL";
        const macd: TrendDirection = ema20 > ema50 ? "BULLISH" : ema20 < ema50 ? "BEARISH" : "NEUTRAL";

        return {
          rsi,
          macd,
          emaTrend,
          atr,
        };
      };

      const m15Indicators: IndicatorData = m15
        ? buildTf(m15)
        : { rsi: 50, macd: "NEUTRAL", emaTrend: "NEUTRAL", atr: 15 };
      const h1Indicators = buildTf(h1);
      const d1Indicators = buildTf(d1);

      const bullishCount = [d1Indicators.emaTrend, h1Indicators.emaTrend, m15Indicators.emaTrend].filter(
        (t) => t === "BULLISH"
      ).length;
      const bearishCount = [d1Indicators.emaTrend, h1Indicators.emaTrend, m15Indicators.emaTrend].filter(
        (t) => t === "BEARISH"
      ).length;
      const overallBias: TrendDirection = bullishCount >= 2 ? "BULLISH" : bearishCount >= 2 ? "BEARISH" : "NEUTRAL";

      const analysis: TechnicalAnalysis = {
        symbol: inst.symbol,
        timeframes: {
          D1: d1Indicators,
          H4: h1Indicators, // Approximated from H1 when H4 is unavailable on basic tier
          H1: h1Indicators,
          M15: m15Indicators,
        },
        overallBias,
      };

      return analysis;
    });

    const results = await Promise.all(technicalPromises);
    const valid = results.filter((t): t is TechnicalAnalysis => t !== null);

    return valid.length > 0 ? valid : MOCK_TECHNICALS;
  } catch (err) {
    console.warn("[Finnhub] Technical analysis fetch error, falling back to mock:", err);
    return MOCK_TECHNICALS;
  }
}
