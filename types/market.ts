export type InstrumentCategory = "MAJOR" | "COMMODITY";

export type Instrument = {
  symbol: string;        // "EURUSD" — internal ID, no slash
  displayName: string;   // "EUR/USD" — shown in the UI
  base: string;          // "EUR"
  quote: string;         // "USD"
  decimals: number;      // price precision: 5 for most pairs, 3 for JPY, 2 for gold
  category: InstrumentCategory;
};

export type MarketBias = "BULLISH" | "BEARISH" | "NEUTRAL";

export type DataStatus = "LIVE" | "DELAYED" | "MOCK" | "UNAVAILABLE";

export type PriceQuote = {
  symbol: string;
  price: number | null;          // null = we do NOT have verified data
  previousClose: number | null;
  high: number | null;
  low: number | null;
  bias: MarketBias;
  sparkline: number[];           // recent closes for the mini chart
  timestamp: string;             // ISO 8601, when the price was recorded
  source: string;                // where the data came from
  delayMinutes: number;          // 0 = live
  status: DataStatus;
};
