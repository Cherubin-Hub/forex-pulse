export type CandleSeries = {
  opens: number[];
  highs: number[];
  lows: number[];
  closes: number[];
  times: number[];
};
export type FeedHealth = {
  feed: string;
  synced_at: string;
  coverage_until: string | null;
};
