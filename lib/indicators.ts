import type { CandleSeries } from "@/types/feed";
import type { IndicatorData } from "@/types/technical";

export function emaSeries(prices: number[], period: number): number[] {
  if (prices.length < period) return [];
  let value =
    prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
  const result = [value];
  for (let i = period; i < prices.length; i++) {
    value += ((prices[i] - value) * 2) / (period + 1);
    result.push(value);
  }
  return result;
}
export function aggregateFourHourCandles(series: CandleSeries): CandleSeries {
  const result: CandleSeries = {
    opens: [],
    highs: [],
    lows: [],
    closes: [],
    times: [],
  };
  const groups = new Map<number, number[]>();
  series.times.forEach((time, index) => {
    const bucket = Math.floor(time / 14400) * 14400;
    groups.set(bucket, [...(groups.get(bucket) ?? []), index]);
  });
  for (const [bucket, indices] of groups) {
    if (
      indices.length !== 4 ||
      indices.some(
        (index, offset) => series.times[index] !== bucket + offset * 3600,
      )
    )
      continue;
    result.times.push(bucket);
    result.opens.push(series.opens[indices[0]]);
    result.closes.push(series.closes[indices[3]]);
    result.highs.push(Math.max(...indices.map((index) => series.highs[index])));
    result.lows.push(Math.min(...indices.map((index) => series.lows[index])));
  }
  return result;
}
export function buildIndicators(
  input: CandleSeries,
  multiplier: number,
  secondsPerBar: number,
  now = Date.now(),
): IndicatorData | null {
  const indices = input.times
    .map((_, index) => index)
    .filter((index) => (input.times[index] + secondsPerBar) * 1000 <= now);
  if (indices.length < 200) return null;
  const closes = indices.map((index) => input.closes[index]);
  const last = indices.at(-1)!;
  if (now - (input.times[last] + secondsPerBar) * 1000 > secondsPerBar * 2000)
    return null;
  const fast = emaSeries(closes, 12),
    slow = emaSeries(closes, 26);
  const macdLine = slow.map((value, index) => fast[index + 14] - value);
  const histogram = macdLine.at(-1)! - emaSeries(macdLine, 9).at(-1)!;
  const ema50 = emaSeries(closes, 50).at(-1)!,
    ema200 = emaSeries(closes, 200).at(-1)!;
  let gain = 0,
    loss = 0;
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (i <= 14) {
      gain += Math.max(0, change) / 14;
      loss += Math.max(0, -change) / 14;
    } else {
      gain = (gain * 13 + Math.max(0, change)) / 14;
      loss = (loss * 13 + Math.max(0, -change)) / 14;
    }
  }
  let atr = 0;
  for (let i = 1; i < indices.length; i++) {
    const index = indices[i],
      previous = input.closes[indices[i - 1]];
    const tr = Math.max(
      input.highs[index] - input.lows[index],
      Math.abs(input.highs[index] - previous),
      Math.abs(input.lows[index] - previous),
    );
    if (i <= 14) atr += tr / 14;
    else atr = (atr * 13 + tr) / 14;
  }
  return {
    rsi: loss === 0 ? (gain === 0 ? 50 : 100) : 100 - 100 / (1 + gain / loss),
    macd: histogram > 0 ? "BULLISH" : histogram < 0 ? "BEARISH" : "NEUTRAL",
    emaTrend:
      closes.at(-1)! > ema50 && ema50 > ema200
        ? "BULLISH"
        : closes.at(-1)! < ema50 && ema50 < ema200
          ? "BEARISH"
          : "NEUTRAL",
    atr: atr * multiplier,
  };
}
