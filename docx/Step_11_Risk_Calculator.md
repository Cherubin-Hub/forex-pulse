# Step 11: Risk Management & Position Size Calculator

## 🎯 Overview
In this step, we build the mathematical risk management engine. The position size calculator enforces strict portfolio rules by computing the exact lot size for any currency trade based on account balance, target risk percentage, stop loss distance in pips, and currency pip value.

---

### 1. Mathematical Formulas
$$\text{Monetary Risk (\$)} = \text{Account Balance} \times \left(\frac{\text{Risk \%}}{100}\right)$$

$$\text{Position Size (Lots)} = \frac{\text{Monetary Risk}}{\text{Stop Loss (Pips)} \times \text{Pip Value per Standard Lot}}$$

*Example:* With a \$10,000 balance, 1.0% risk (\$100), and a 20-pip stop loss on EUR/USD (\$10/pip):
$$\text{Lots} = \frac{100}{20 \times 10} = \mathbf{0.50 \text{ Lots}}$$

---

### 2. Full Position Calculator (`components/risk/PositionCalculator.tsx`)

**File:** `components/risk/PositionCalculator.tsx`
```tsx
"use client";

import { useState, useEffect } from "react";
import { Calculator } from "lucide-react";
import { useSettings } from "@/components/providers/SettingsProvider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INSTRUMENTS } from "@/lib/constants/instruments";
import { formatPrice } from "@/lib/formatters";

export function PositionCalculator() {
  const { settings, isLoaded } = useSettings();
  
  // Local state for the calculator
  const [balance, setBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1);
  const [stopLoss, setStopLoss] = useState<number>(20);
  const [pair, setPair] = useState("EURUSD");

  // Automatically sync the risk percent from user settings when loaded
  useEffect(() => {
    if (isLoaded && settings) {
      setRiskPercent(settings.riskPerTradePercent);
    }
  }, [isLoaded, settings]);

  // Position Sizing Math
  const riskAmount = balance * (riskPercent / 100);
  
  // For XXX/USD pairs, 1 standard lot = $10/pip.
  // For JPY quote pairs, it fluctuates based on exchange rates (~$6.50/pip).
  const isJpy = pair.includes("JPY");
  const pipValue = isJpy ? 6.5 : 10; 
  
  // Prevent division by zero
  const rawLotSize = stopLoss > 0 ? riskAmount / (stopLoss * pipValue) : 0;
  const lotSize = stopLoss > 0 ? Math.max(0.01, Number(rawLotSize.toFixed(2))) : 0;

  // Hydration safety: render a skeleton until settings load
  if (!isLoaded) {
    return <div className="h-[400px] animate-pulse rounded-xl bg-card/50 border border-border"></div>;
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 p-4">
        <Calculator className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Position Size Calculator</h3>
      </div>
      
      <div className="p-6 grid gap-8 md:grid-cols-2">
        {/* Input Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Account Balance ($)</Label>
            <Input 
              type="number" 
              value={balance || ""} 
              onChange={(e) => setBalance(Number(e.target.value))} 
            />
          </div>
          
          <div className="space-y-2">
            <Label>Risk Percentage (%)</Label>
            <Input 
              type="number" 
              step="0.1"
              value={riskPercent || ""} 
              onChange={(e) => setRiskPercent(Number(e.target.value))} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Stop Loss (Pips)</Label>
              <Input 
                type="number" 
                value={stopLoss || ""} 
                onChange={(e) => setStopLoss(Number(e.target.value))} 
              />
            </div>
            <div className="space-y-2">
              <Label>Currency Pair</Label>
              <select 
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={pair}
                onChange={(e) => setPair(e.target.value)}
              >
                {INSTRUMENTS.map((inst) => (
                  <option key={inst.symbol} value={inst.symbol}>
                    {inst.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Output Display */}
        <div className="flex flex-col items-center justify-center rounded-lg bg-muted/50 p-6 text-center border border-dashed border-border">
          <p className="text-sm font-medium text-muted-foreground mb-1">Recommended Lot Size</p>
          <p className="text-6xl font-bold tracking-tighter text-primary mb-6">
            {lotSize.toFixed(2)}
          </p>
          
          <div className="flex items-center gap-6 w-full justify-center">
            <div>
              <p className="text-xs text-muted-foreground">Amount at Risk</p>
              <p className="text-lg font-semibold text-rose-500 tabular-nums">
                ${formatPrice(riskAmount, 2)}
              </p>
            </div>
            <div className="h-8 w-px bg-border"></div>
            <div>
              <p className="text-xs text-muted-foreground">Pip Value (Approx)</p>
              <p className="text-lg font-semibold tabular-nums">
                ${formatPrice(pipValue, 2)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### 3. Risk Rules Sidebar Constraint Card (`components/risk/RiskRulesCard.tsx`)

**File:** `components/risk/RiskRulesCard.tsx`
```tsx
"use client";

import { AlertCircle, ShieldCheck } from "lucide-react";
import { useSettings } from "@/components/providers/SettingsProvider";

export function RiskRulesCard() {
  const { settings } = useSettings();

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
      <div className="flex items-center gap-2 text-primary font-semibold">
        <ShieldCheck className="h-5 w-5" />
        <h4>Your Risk Rules</h4>
      </div>

      <div className="space-y-3 text-xs text-muted-foreground">
        <div className="flex justify-between border-b border-border/50 pb-2">
          <span>Max Risk Per Trade:</span>
          <span className="font-bold text-foreground">{settings.riskPerTradePercent}%</span>
        </div>
        <div className="flex justify-between border-b border-border/50 pb-2">
          <span>Minimum R:R Target:</span>
          <span className="font-bold text-foreground">1:{settings.minRiskReward}</span>
        </div>
        <div className="flex justify-between border-b border-border/50 pb-2">
          <span>Max Simultaneous Setups:</span>
          <span className="font-bold text-foreground">{settings.maxOpenSetups}</span>
        </div>
      </div>

      <div className="rounded-lg bg-amber-500/10 p-3 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <p>Never exceed your defined maximum risk per trade. Inconsistent sizing destroys statistical edge.</p>
      </div>
    </div>
  );
}
```

---

### 4. Risk Page Container (`app/(dashboard)/risk/page.tsx`)

**File:** `app/(dashboard)/risk/page.tsx`
```tsx
import { ShieldAlert } from "lucide-react";
import { PositionCalculator } from "@/components/risk/PositionCalculator";
import { RiskRulesCard } from "@/components/risk/RiskRulesCard";

export default function RiskPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            Risk Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Calculate your precise position size and respect your account parameters.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <PositionCalculator />
        </div>
        <div className="space-y-6">
          <RiskRulesCard />
        </div>
      </div>
    </div>
  );
}
```

#### Why this was written this way:
- **Settings Synchronization:** Automatically populates `riskPercent` from the user's saved account settings (`SettingsProvider`).
- **Currency-Specific Pip Multipliers:** Adjusts pip calculations automatically when JPY crosses are selected, accounting for exchange rate differences.
