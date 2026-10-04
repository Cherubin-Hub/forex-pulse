import type { GoldDriver, KeyLevel } from "@/types/gold";

export const MOCK_GOLD_DRIVERS: GoldDriver[] = [
  {
    id: "dxy",
    name: "US Dollar Index (DXY)",
    value: "104.25",
    change: +0.15,
    correlation: "NEGATIVE",
    impact: "BEARISH",
  },
  {
    id: "us10y",
    name: "US 10Y Treasury Yield",
    value: "4.21%",
    change: +0.03,
    correlation: "NEGATIVE",
    impact: "BEARISH",
  },
  {
    id: "geopolitics",
    name: "Geopolitical Risk Index",
    value: "Elevated",
    change: 0,
    correlation: "POSITIVE",
    impact: "BULLISH",
  }
];

export const MOCK_KEY_LEVELS: KeyLevel[] = [
  { id: "r2", price: 2685.50, type: "RESISTANCE", strength: "STRONG", notes: "All-time High area" },
  { id: "r1", price: 2660.00, type: "RESISTANCE", strength: "MODERATE", notes: "Previous daily high" },
  { id: "p", price: 2645.00, type: "PIVOT", strength: "WEAK", notes: "Intraday pivot" },
  { id: "s1", price: 2625.00, type: "SUPPORT", strength: "MODERATE", notes: "H4 Order Block" },
  { id: "s2", price: 2600.00, type: "SUPPORT", strength: "STRONG", notes: "Psychological & D1 Demand" },
];
