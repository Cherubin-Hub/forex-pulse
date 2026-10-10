# Step 14: Trading Setup Domain Model & State Machine

## 🎯 Objective
Define a strict Finite State Machine (FSM) governing trading setup lifecycles from formation to resolution. The system eliminates emotional trade management and impulsive execution by enforcing objective boundaries: price levels must satisfy strict mathematical invariants, directional boundaries are validated using Zod, Risk-to-Reward (R:R) ratios are computed deterministically, and setup states can only transition through authorized pathways (`WAITING_FOR_CONFIRMATION` -> `ENTRY_TRIGGERED` -> `TP_REACHED` | `SL_HIT` | `INVALIDATED` | `EXPIRED`).

---

## 🛠 Step-by-Step Implementation

### 1. Define Trading Setup Domain Model & Status Types (`types/setup.ts`)
Define the core TypeScript interfaces governing trade directions, lifecycle states, and setup properties.

**File:** `types/setup.ts`
```typescript
export type TradeDirection = "LONG" | "SHORT";

export type SetupStatus =
  | "WAITING_FOR_CONFIRMATION" // Pending alert
  | "ENTRY_TRIGGERED"          // Active trade
  | "TP_REACHED"               // Won
  | "SL_HIT"                   // Lost
  | "INVALIDATED"              // Structure broke before entry
  | "EXPIRED";                 // Session ended before entry

export type TradingSetup = {
  id: string;
  symbol: string;              // "EURUSD"
  direction: TradeDirection;
  
  // Price levels
  entryMin: number;
  entryMax: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number | null;  // Optional second target
  
  // Analytics (Computed by the system)
  riskReward: number;
  
  // State
  status: SetupStatus;
  invalidationRule: string;    // e.g. "H1 acceptance above 1.1300"
  notes: string;
  confluenceTags: string[];    // e.g. ["Liquidity Sweep", "Fib 61.8"]
  
  createdAt: string;           // ISO 8601
  updatedAt: string;           // ISO 8601
};
```

#### Why this was written this way:
- **Strict `SetupStatus` Union:** Expresses the exact 6 possible lifecycle states of a setup. Having explicit terminal states like `INVALIDATED` and `EXPIRED` prevents deleted setups from polluting historical performance while distinguishing bad setups from losing trades.
- **Entry Zone Range (`entryMin` / `entryMax`):** Institutional Forex traders rarely enter at a single price; they enter across an order block or liquidity zone. Tracking an entry zone enables high-accuracy entry confirmation.
- **Pre-defined `invalidationRule`:** Mandates that a trader must articulate what invalidates the trade *before* it triggers (e.g. "H1 candle closes beyond resistance"). This prevents emotional moving of stop losses in real-time.
- **Computed `riskReward`:** R:R is computed server-side by the system rather than entered manually by the user to avoid inflated or fabricated risk numbers.

---

### 2. Define Instrument Catalog with Precision Rules (`lib/constants/instruments.ts`)
Create a centralized catalog of supported currency pairs and commodities with their decimal precision and base/quote denominations.

**File:** `lib/constants/instruments.ts`
```typescript
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
```

#### Why this was written this way:
- **Precision Preservation:** JPY pairs use 3 decimals, gold uses 2 decimals, and standard FX majors use 5 decimals (fractional pips). Centralizing this prevents awkward pricing formatting (like `148.50000` for USDJPY or `2635.12345` for Gold).
- **Single Source of Truth:** Used across price formatters, setup cards, position calculators, and input validators.

---

### 3. Implement Risk:Reward Calculation & Rule Engine (`lib/setupUtils.ts`)
Create pure calculation and validation functions to verify risk geometry before setups can be submitted.

**File:** `lib/setupUtils.ts`
```typescript
import type { TradeDirection } from "@/types/setup";

/**
 * Calculates Risk:Reward ratio.
 * Always returns a positive number (e.g., 2.5 for a 1:2.5 trade).
 */
export function calculateRiskReward(
  direction: TradeDirection,
  entryAvg: number,
  stopLoss: number,
  takeProfit: number
): number {
  if (entryAvg === stopLoss) return 0; // Prevent division by zero

  const risk = Math.abs(entryAvg - stopLoss);
  const reward = Math.abs(takeProfit - entryAvg);
  
  // Double-check logic: A LONG trade must have TP > Entry > SL.
  if (direction === "LONG" && (takeProfit <= entryAvg || stopLoss >= entryAvg)) return 0;
  if (direction === "SHORT" && (takeProfit >= entryAvg || stopLoss <= entryAvg)) return 0;

  return reward / risk;
}

/**
 * Validates if a setup passes the user's strict risk rules.
 */
export function validateSetupRisk(
  rr: number,
  minAllowedRR: number
): { isValid: boolean; reason?: string } {
  if (rr < minAllowedRR) {
    return {
      isValid: false,
      reason: `R:R of 1:${rr.toFixed(1)} is below your minimum rule of 1:${minAllowedRR}`,
    };
  }
  return { isValid: true };
}
```

#### Why this was written this way:
- **Zero-Division & Geometry Protection:** If `entryAvg === stopLoss`, returns `0` immediately to avoid `Infinity` or `NaN`.
- **Directional Integrity Check:** Enforces that a `LONG` trade cannot have a Take Profit below entry or Stop Loss above entry, and vice-versa for `SHORT`.
- **Discipline Enforcement:** `validateSetupRisk` compares computed R:R against the trader's profile rules (e.g. minimum 1:2.0), forbidding poor-reward trades.

---

### 4. Implement Zod Validation Schema with Directional Rules (`lib/schemas/setup.ts`)
Build the Zod schema with `.refine()` validation to reject invalid price geometry at the form and API boundary.

**File:** `lib/schemas/setup.ts`
```typescript
import { z } from "zod";

export const createSetupSchema = z
  .object({
    symbol: z.string().min(3, "Symbol is required").toUpperCase(),
    direction: z.enum(["LONG", "SHORT"]),
    entryMin: z.number().positive("Must be greater than 0"),
    entryMax: z.number().positive("Must be greater than 0"),
    stopLoss: z.number().positive("Stop loss must be greater than 0"),
    takeProfit1: z.number().positive("Take profit must be greater than 0"),
    invalidationRule: z
      .string()
      .min(5, "Define a clear invalidation rule (e.g. H1 close beyond SL)"),
    notes: z.string().optional(),
    confluenceTags: z.string().optional(), // Comma-separated in form, parsed to array
  })
  .refine(
    (data) => {
      if (data.direction === "LONG") {
        return data.stopLoss < data.entryMin && data.takeProfit1 > data.entryMax;
      } else {
        return data.stopLoss > data.entryMax && data.takeProfit1 < data.entryMin;
      }
    },
    {
      message:
        "Price levels invalid: For LONG, SL must be below entry and TP above. For SHORT, SL must be above entry and TP below.",
      path: ["stopLoss"],
    }
  );

export type CreateSetupFormData = z.infer<typeof createSetupSchema>;
```

#### Why this was written this way:
- **Multi-Field `.refine()` Rule:** Standard single-field schemas cannot validate that `stopLoss < entryMin < takeProfit1`. The `.refine()` function cross-validates all four price fields against the chosen `direction`.
- **Targeted Error Path:** Attaching the error `path: ["stopLoss"]` highlights the exact field in the UI form where the geometric conflict occurs.
- **Auto-Capitalization & Type Ingestion:** Automatically transforms `"eurusd"` into `"EURUSD"` using `.toUpperCase()`.

---

### 5. Finite State Machine (FSM) Lifecycle Architecture & Rules

#### Lifecycle State Diagram
```text
                  +---------------------------+
                  | WAITING_FOR_CONFIRMATION  |
                  +---------------------------+
                         /         |        \
    (Price Hits Entry)  /          |         \  (Market Structure Breaks)
                       v           |          v
            +-----------------+    |   +---------------+
            | ENTRY_TRIGGERED |    |   |  INVALIDATED  |
            +-----------------+    |   +---------------+
                 /         \       |
    (TP Target) /           \ (SL) | (Session Closes Unfilled)
               v             v     v
         +-----------+   +---------+   +---------+
         | TP_REACHED|   | SL_HIT  |   | EXPIRED |
         +-----------+   +---------+   +---------+
```

#### Transition Invariants Table

| From State | Allowed Transition | Trigger Condition | Consequence |
| :--- | :--- | :--- | :--- |
| `WAITING_FOR_CONFIRMATION` | `ENTRY_TRIGGERED` | Price touches entry zone (`entryMin` - `entryMax`). | Trade is active. Risk is live in the market. |
| `WAITING_FOR_CONFIRMATION` | `INVALIDATED` | Invalidation rule met before entry. | Trade is cancelled without risk loss. |
| `WAITING_FOR_CONFIRMATION` | `EXPIRED` | Trading session ended without price reaching zone. | Setup archived as unfilled. |
| `ENTRY_TRIGGERED` | `TP_REACHED` | Market price touches or exceeds `takeProfit1`. | Trade logged as winning trade; added to win-rate stats. |
| `ENTRY_TRIGGERED` | `SL_HIT` | Market price reaches or violates `stopLoss`. | Trade logged as loss; added to loss-rate stats. |
| `TP_REACHED` / `SL_HIT` | *Terminal* | Setup lifecycle concluded. | State is locked; cannot re-enter active status. |

---

## 🧪 Verification & Testing
1. Test Zod validation with deliberate geometric errors:
   - Input a `LONG` with `entryMin = 1.1000`, `stopLoss = 1.1050`, `takeProfit1 = 1.1200`. Confirm the schema throws an error with the message *"Price levels invalid: For LONG, SL must be below entry and TP above"*.
2. Test `calculateRiskReward("LONG", 1.1000, 1.0950, 1.1150)`. Confirm that risk = 0.0050, reward = 0.0150, and the function returns exactly `3.0` (1:3.0 R:R).
3. Test `validateSetupRisk(1.5, 2.0)`. Confirm that `isValid` returns `false` with the violation explanation.
