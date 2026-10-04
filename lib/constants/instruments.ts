import type { Instrument } from "@/types/market";

export const INSTRUMENTS: Instrument[] = [
  { symbol: "EURUSD", displayName: "EUR/USD", base: "EUR", quote: "USD", decimals: 5, category: "MAJOR" },
  { symbol: "GBPUSD", displayName: "GBP/USD", base: "GBP", quote: "USD", decimals: 5, category: "MAJOR" },
  { symbol: "USDJPY", displayName: "USD/JPY", base: "USD", quote: "JPY", decimals: 3, category: "MAJOR" },
  { symbol: "AUDUSD", displayName: "AUD/USD", base: "AUD", quote: "USD", decimals: 5, category: "MAJOR" },
  { symbol: "NZDUSD", displayName: "NZD/USD", base: "NZD", quote: "USD", decimals: 5, category: "MAJOR" },
  { symbol: "USDCAD", displayName: "USD/CAD", base: "USD", quote: "CAD", decimals: 5, category: "MAJOR" },
  { symbol: "USDCHF", displayName: "USD/CHF", base: "USD", quote: "CHF", decimals: 5, category: "MAJOR" },
  { symbol: "XAUUSD", displayName: "XAU/USD", base: "XAU", quote: "USD", decimals: 2, category: "COMMODITY" },
];
