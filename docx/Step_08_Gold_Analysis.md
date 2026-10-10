# Step 8: Gold (XAU/USD) Macro Driver Analysis Hub

## 🎯 Overview
In this step, we implement specialized macroeconomic tracking for Gold (XAU/USD). Gold is primarily driven by US Real Yields (US 10-Year TIPS) and the US Dollar Index (DXY). This module tracks correlation drivers, institutional bias impacts, and key technical market structure levels.

---

### 1. Gold Data Models (`types/gold.ts`)

**File:** `types/gold.ts`
```typescript
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
```

---

### 2. Service Layer Controller (`lib/services/gold.ts`)

**File:** `lib/services/gold.ts`
```typescript
import type { GoldDriver, KeyLevel } from "@/types/gold";
import { MOCK_GOLD_DRIVERS, MOCK_KEY_LEVELS } from "@/lib/mock/gold";

export async function getGoldDrivers(): Promise<GoldDriver[]> {
  return MOCK_GOLD_DRIVERS;
}

export async function getGoldKeyLevels(): Promise<KeyLevel[]> {
  return MOCK_KEY_LEVELS;
}
```

---

### 3. Gold Analysis Page (`app/(dashboard)/gold/page.tsx`)

**File:** `app/(dashboard)/gold/page.tsx`
```tsx
import { getGoldDrivers, getGoldKeyLevels } from "@/lib/services/gold";
import { getQuotes } from "@/lib/services/marketData";
import { GoldDrivers } from "@/components/gold/GoldDrivers";
import { KeyLevels } from "@/components/gold/KeyLevels";
import { formatPrice, calculateChange, formatPercent } from "@/lib/formatters";
import { TrendingUp, TrendingDown } from "lucide-react";

export default async function GoldPage() {
  const [drivers, levels, quotes] = await Promise.all([
    getGoldDrivers(),
    getGoldKeyLevels(),
    getQuotes()
  ]);

  const goldQuote = quotes.find(q => q.symbol === "XAUUSD");
  const changeObj = goldQuote ? calculateChange(goldQuote.price, goldQuote.previousClose) : null;

  return (
    <div className="space-y-8">
      {/* Header section with live price */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <span className="text-amber-500">Gold</span> Analysis
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            XAU/USD market drivers and technical structure.
          </p>
        </div>
        
        {goldQuote && goldQuote.price !== null && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
            <div>
              <p className="text-xs text-muted-foreground">Current Price</p>
              <p className="text-xl font-bold tabular-nums tracking-tight">
                {formatPrice(goldQuote.price, 2)}
              </p>
            </div>
            {changeObj && (
              <div className={`flex flex-col items-end ${changeObj.isPositive ? "text-emerald-500" : "text-rose-500"}`}>
                {changeObj.isPositive ? <TrendingUp className="h-4 w-4 mb-1" /> : <TrendingDown className="h-4 w-4 mb-1" />}
                <span className="text-xs font-semibold tabular-nums">
                  {formatPercent(changeObj.percent)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <section>
        <h3 className="text-base font-semibold mb-4">Macro Drivers</h3>
        <GoldDrivers drivers={drivers} />
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-base font-semibold mb-4">Market Structure</h3>
          <KeyLevels levels={levels} />
        </div>
        <div className="rounded-xl border border-dashed border-border bg-card/50 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
          <p className="mb-2">Interactive Chart Placeholder</p>
          <p className="text-xs">TradingView widget will go here in Phase 2.</p>
        </div>
      </section>
    </div>
  );
}
```

#### Why this was written this way:
- **Parallel Fetching with `Promise.all`:** Initiates requests for macro drivers, key levels, and live quotes concurrently on the server, minimizing response latency.
- **Centralized Formatter Integration:** Calculates price change percentages via `calculateChange` and formats currency to 2 decimals using `formatPrice`, ensuring strict type and visual consistency.
