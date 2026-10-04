export type GoldDriver = {
  id: string;
  name: string; // e.g., "US 10Y Yield", "DXY"
  value: string;
  change: number; 
  correlation: "POSITIVE" | "NEGATIVE";
  impact: "BULLISH" | "BEARISH" | "NEUTRAL";
};

export type KeyLevel = {
  id: string;
  price: number;
  type: "SUPPORT" | "RESISTANCE" | "PIVOT";
  strength: "STRONG" | "MODERATE" | "WEAK";
  notes?: string;
};
