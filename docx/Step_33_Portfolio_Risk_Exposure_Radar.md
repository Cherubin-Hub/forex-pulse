# Step 33: Portfolio Risk Exposure Radar & Dynamic Sizing Engine

## 🎯 Objective
Upgrade the Risk Management Hub (`/risk`) from a basic single-pair calculator into an institutional portfolio risk radar and dynamic lot sizing engine. This step delivers:
1. **Live Portfolio Risk Matrix & Currency Correlation Radar:** Aggregates all currently active and waiting setups to calculate total committed capital at risk ($ and %) and maps net directional exposure per currency (e.g., detecting if multiple setups are simultaneously Short USD).
2. **Institutional Multi-Asset Position Sizer:** Supports dual calculation modes (**By Pips** and **By Price Levels**), accurate pip and point math for Forex majors, JPY pairs, and Gold (`XAUUSD` 100-oz contract sizing), with quick risk presets (`0.5%`, `1.0%`, `1.5%`, `2.0%`) and margin projections.
3. **Account Drawdown & Recovery Resilience Matrix:** Calculates consecutive loss simulations and demonstrates the asymmetric mathematical penalty of drawdowns (e.g., -10% drawdown requiring +11.1% gain to recover).

---

## 🛠 Step-by-Step Implementation

### 1. Create Risk & Exposure Math Utilities (`lib/riskUtils.ts`)
Create pure mathematical utilities to compute position sizing across asset classes, portfolio currency correlation exposures, and drawdown recovery tables.

**File:** `lib/riskUtils.ts`
```typescript
import type { TradingSetup } from "@/types/setup";
import type { UserSettings } from "@/lib/schemas/settings";
import { INSTRUMENTS } from "@/lib/constants/instruments";

export type CalculationMode = "PIPS" | "PRICE";

export type PositionSizeParams = {
  balance: number;
  riskPercent: number;
  symbol: string;
  mode: CalculationMode;
  slPips?: number;
  entryPrice?: number;
  stopLossPrice?: number;
};

export type PositionSizeResult = {
  riskAmount: number;
  lotSize: number;
  miniLots: number;
  microLots: number;
  units: number;
  effectiveSlPips: number;
  pipValuePerLot: number;
  estimatedMargin: number;
};

export type CurrencyNetExposure = {
  currency: string;
  netDirection: "LONG" | "SHORT" | "NEUTRAL";
  netScore: number;
  tradeCount: number;
  symbols: string[];
};

export type PortfolioRiskSummary = {
  openSetupsCount: number;
  maxOpenSetups: number;
  capacityPercent: number;
  totalRiskPercent: number;
  totalRiskAmount: number;
  currencyExposures: CurrencyNetExposure[];
  correlationWarnings: string[];
};

export type DrawdownStep = {
  losses: number;
  remainingBalance: number;
  drawdownPercent: number;
  requiredRecoveryPercent: number;
};

/**
 * Calculates accurate lot sizing, pip value, and margin across Forex and Commodities.
 */
export function calculatePositionSize(params: PositionSizeParams): PositionSizeResult {
  const { balance, riskPercent, symbol, mode, slPips = 20, entryPrice = 0, stopLossPrice = 0 } = params;

  const riskAmount = Number((balance * (riskPercent / 100)).toFixed(2));
  const isGold = symbol === "XAUUSD";
  const isJpy = symbol.includes("JPY");

  let effectiveSlPips = 0;
  let pipValuePerLot = 10; // Default $10/pip for standard EUR/USD lot

  if (isGold) {
    // 1 standard lot = 100 troy oz. $1.00 price change = $100 per lot.
    // 1 pip (0.10) = $10.00 per lot.
    pipValuePerLot = 10;
    if (mode === "PRICE") {
      const priceDistance = Math.abs(entryPrice - stopLossPrice);
      effectiveSlPips = Number((priceDistance * 10).toFixed(1)); // 1 pip = 0.10
    } else {
      effectiveSlPips = Math.max(0.1, slPips);
    }
  } else if (isJpy) {
    // 1 pip = 0.01. Approximate USD value per pip is ~$6.50
    pipValuePerLot = 6.5;
    if (mode === "PRICE") {
      const priceDistance = Math.abs(entryPrice - stopLossPrice);
      effectiveSlPips = Number((priceDistance / 0.01).toFixed(1));
    } else {
      effectiveSlPips = Math.max(1, slPips);
    }
  } else {
    // Standard major pairs (EURUSD, GBPUSD, AUDUSD, etc.)
    pipValuePerLot = symbol === "USDCAD" || symbol === "USDCHF" ? 7.3 : 10;
    if (mode === "PRICE") {
      const priceDistance = Math.abs(entryPrice - stopLossPrice);
      effectiveSlPips = Number((priceDistance / 0.0001).toFixed(1));
    } else {
      effectiveSlPips = Math.max(1, slPips);
    }
  }

  // Prevent division by zero
  const rawLots = effectiveSlPips > 0 ? riskAmount / (effectiveSlPips * pipValuePerLot) : 0;
  const lotSize = Math.max(0.01, Number(rawLots.toFixed(2)));
  const miniLots = Number((lotSize * 10).toFixed(1));
  const microLots = Number((lotSize * 100).toFixed(0));

  const contractMultiplier = isGold ? 100 : 100000;
  const units = Math.round(lotSize * contractMultiplier);

  // Approximate margin required at 1:100 leverage
  const referencePrice = entryPrice > 0 ? entryPrice : isGold ? 2650 : 1.1;
  const notionalValue = isGold ? units * referencePrice : lotSize * 100000;
  const estimatedMargin = Number((notionalValue / 100).toFixed(2));

  return {
    riskAmount,
    lotSize,
    miniLots,
    microLots,
    units,
    effectiveSlPips,
    pipValuePerLot,
    estimatedMargin,
  };
}

/**
 * Aggregates live open risk and directional currency exposures across active setups.
 */
export function calculatePortfolioExposure(
  setups: TradingSetup[],
  settings: UserSettings,
  balance: number
): PortfolioRiskSummary {
  const active = setups.filter(
    (s) => s.status === "WAITING_FOR_CONFIRMATION" || s.status === "ENTRY_TRIGGERED"
  );

  const openSetupsCount = active.length;
  const maxOpenSetups = settings.maxOpenSetups;
  const capacityPercent = Math.min(100, Math.round((openSetupsCount / maxOpenSetups) * 100));

  const totalRiskPercent = Number((openSetupsCount * settings.riskPerTradePercent).toFixed(2));
  const totalRiskAmount = Number((balance * (totalRiskPercent / 100)).toFixed(2));

  // Currency Net Exposure Map
  const currencyScores: Record<string, { net: number; symbols: Set<string> }> = {};

  for (const s of active) {
    const inst = INSTRUMENTS.find((i) => i.symbol === s.symbol);
    const base = inst?.base ?? s.symbol.slice(0, 3);
    const quote = inst?.quote ?? s.symbol.slice(3, 6);

    if (!currencyScores[base]) currencyScores[base] = { net: 0, symbols: new Set() };
    if (!currencyScores[quote]) currencyScores[quote] = { net: 0, symbols: new Set() };

    currencyScores[base].symbols.add(s.symbol);
    currencyScores[quote].symbols.add(s.symbol);

    if (s.direction === "LONG") {
      currencyScores[base].net += 1;
      currencyScores[quote].net -= 1;
    } else {
      currencyScores[base].net -= 1;
      currencyScores[quote].net += 1;
    }
  }

  const currencyExposures: CurrencyNetExposure[] = Object.entries(currencyScores)
    .filter(([_, data]) => data.symbols.size > 0)
    .map(([currency, data]) => {
      let netDirection: "LONG" | "SHORT" | "NEUTRAL" = "NEUTRAL";
      if (data.net > 0) netDirection = "LONG";
      else if (data.net < 0) netDirection = "SHORT";

      return {
        currency,
        netDirection,
        netScore: data.net,
        tradeCount: data.symbols.size,
        symbols: Array.from(data.symbols),
      };
    })
    .sort((a, b) => Math.abs(b.netScore) - Math.abs(a.netScore));

  // Correlation Warnings (Flag when 2 or more positions stack on the same currency direction)
  const correlationWarnings: string[] = [];
  for (const exp of currencyExposures) {
    if (Math.abs(exp.netScore) >= 2) {
      correlationWarnings.push(
        `Correlated Exposure: ${Math.abs(exp.netScore)} setups are Net ${exp.netDirection} on ${exp.currency} (${exp.symbols.join(", ")}).`
      );
    }
  }

  return {
    openSetupsCount,
    maxOpenSetups,
    capacityPercent,
    totalRiskPercent,
    totalRiskAmount,
    currencyExposures,
    correlationWarnings,
  };
}

/**
 * Calculates consecutive drawdown damage and required mathematical recovery gains.
 */
export function calculateDrawdownTable(balance: number, riskPercent: number): DrawdownStep[] {
  const steps = [1, 2, 3, 5, 8, 10];

  return steps.map((losses) => {
    const remaining = balance * Math.pow(1 - riskPercent / 100, losses);
    const drawdownPercent = Number((((balance - remaining) / balance) * 100).toFixed(2));
    const requiredRecoveryPercent = Number((((balance - remaining) / remaining) * 100).toFixed(2));

    return {
      losses,
      remainingBalance: Number(remaining.toFixed(2)),
      drawdownPercent,
      requiredRecoveryPercent,
    };
  });
}
```

---

### 2. Create Portfolio Exposure Radar Card (`components/risk/PortfolioExposureRadar.tsx`)
Create a real-time portfolio radar displaying total committed capital risk, open capacity gauge, net currency exposures, and correlation warning banners.

**File:** `components/risk/PortfolioExposureRadar.tsx`
```tsx
"use client";

import { useMemo } from "react";
import { ShieldAlert, AlertTriangle, Layers, Activity } from "lucide-react";
import type { TradingSetup } from "@/types/setup";
import { useSettings } from "@/components/providers/SettingsProvider";
import { calculatePortfolioExposure } from "@/lib/riskUtils";
import { cn } from "@/lib/utils";

interface PortfolioExposureRadarProps {
  activeSetups: TradingSetup[];
}

export function PortfolioExposureRadar({ activeSetups }: PortfolioExposureRadarProps) {
  const { settings, isLoaded } = useSettings();

  const summary = useMemo(() => {
    if (!isLoaded || !settings) return null;
    return calculatePortfolioExposure(activeSetups, settings, 10000);
  }, [activeSetups, settings, isLoaded]);

  if (!isLoaded || !summary) {
    return <div className="h-44 rounded-xl bg-card/50 border border-border animate-pulse" />;
  }

  const isAtCapacity = summary.openSetupsCount >= summary.maxOpenSetups;
  const isHighRisk = summary.totalRiskPercent >= 3.0;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
      {/* Top Header Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Live Portfolio Risk & Exposure Radar
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time aggregate risk across {summary.openSetupsCount} active and pending trading setups.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span
              className={cn(
                "text-base font-bold font-mono",
                isHighRisk ? "text-rose-500" : "text-primary"
              )}
            >
              {summary.totalRiskPercent}%
            </span>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Committed Risk</p>
          </div>

          <div className="text-right">
            <span
              className={cn(
                "text-base font-bold font-mono",
                isAtCapacity ? "text-rose-500" : "text-foreground"
              )}
            >
              {summary.openSetupsCount} / {summary.maxOpenSetups}
            </span>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Capacity</p>
          </div>
        </div>
      </div>

      {/* Capacity Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            Portfolio Capacity Utilization
          </span>
          <span className="font-mono font-medium">{summary.capacityPercent}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-300",
              summary.capacityPercent >= 90
                ? "bg-rose-500"
                : summary.capacityPercent >= 60
                ? "bg-amber-500"
                : "bg-emerald-500"
            )}
            style={{ width: `${summary.capacityPercent}%` }}
          />
        </div>
      </div>

      {/* Correlation Warnings */}
      {summary.correlationWarnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-1">
          {summary.correlationWarnings.map((warn, i) => (
            <p key={i} className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {warn}
            </p>
          ))}
        </div>
      )}

      {/* Net Directional Currency Exposures */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Net Currency Directional Bias
        </p>
        {summary.currencyExposures.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No open market exposures detected.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {summary.currencyExposures.map((exp) => (
              <div
                key={exp.currency}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium",
                  exp.netDirection === "LONG"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : exp.netDirection === "SHORT"
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    : "border-border bg-muted/40 text-muted-foreground"
                )}
              >
                <span className="font-bold">{exp.currency}</span>
                <span className="text-[10px] uppercase font-mono px-1 py-0.2 rounded bg-background/60">
                  {exp.netDirection === "LONG" ? `+${exp.netScore} Long` : `${exp.netScore} Short`}
                </span>
                <span className="text-[10px] text-muted-foreground">({exp.tradeCount} trades)</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### 3. Create Advanced Position Calculator (`components/risk/AdvancedPositionCalculator.tsx`)
Create an institutional calculator supporting Pips vs Price levels, quick percentage chips, and lot breakdowns.

**File:** `components/risk/AdvancedPositionCalculator.tsx`
```tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { Calculator, ArrowRight, DollarSign, Percent } from "lucide-react";
import { useSettings } from "@/components/providers/SettingsProvider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { INSTRUMENTS } from "@/lib/constants/instruments";
import { calculatePositionSize, type CalculationMode } from "@/lib/riskUtils";

export function AdvancedPositionCalculator() {
  const { settings, isLoaded } = useSettings();

  const [balance, setBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1);
  const [pair, setPair] = useState("EURUSD");
  const [mode, setMode] = useState<CalculationMode>("PIPS");
  const [slPips, setSlPips] = useState<number>(20);
  const [entryPrice, setEntryPrice] = useState<number>(1.1250);
  const [stopLossPrice, setStopLossPrice] = useState<number>(1.1230);

  // Sync default risk percentage from user settings
  useEffect(() => {
    if (isLoaded && settings) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration match pattern
      setRiskPercent(settings.riskPerTradePercent);
    }
  }, [isLoaded, settings]);

  const sizing = useMemo(() => {
    return calculatePositionSize({
      balance,
      riskPercent,
      symbol: pair,
      mode,
      slPips,
      entryPrice,
      stopLossPrice,
    });
  }, [balance, riskPercent, pair, mode, slPips, entryPrice, stopLossPrice]);

  if (!isLoaded) {
    return <div className="h-[480px] animate-pulse rounded-xl bg-card/50 border border-border" />;
  }

  const QUICK_RISKS = [0.5, 1.0, 1.5, 2.0];

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/30 p-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm">Institutional Position Sizer</h3>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center rounded-lg border border-border bg-background p-0.5">
          <button
            type="button"
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              mode === "PIPS" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setMode("PIPS")}
          >
            By Pips
          </button>
          <button
            type="button"
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              mode === "PRICE" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setMode("PRICE")}
          >
            By Price
          </button>
        </div>
      </div>

      <div className="p-6 grid gap-8 lg:grid-cols-2">
        {/* Input Parameters */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Account Balance ($)</Label>
            <Input
              type="number"
              value={balance || ""}
              onChange={(e) => setBalance(Number(e.target.value))}
              className="font-mono text-sm"
            />
          </div>

          {/* Quick Risk Buttons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Risk Per Trade (%)</Label>
              <span className="text-xs font-mono font-semibold text-primary">{riskPercent}%</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_RISKS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={riskPercent === preset ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs font-semibold"
                  onClick={() => setRiskPercent(preset)}
                >
                  {preset}%
                </Button>
              ))}
            </div>
          </div>

          {/* Instrument Selector */}
          <div className="space-y-2">
            <Label className="text-xs">Instrument / Asset</Label>
            <select
              value={pair}
              onChange={(e) => setPair(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {INSTRUMENTS.map((inst) => (
                <option key={inst.symbol} value={inst.symbol}>
                  {inst.displayName} ({inst.category})
                </option>
              ))}
            </select>
          </div>

          {/* Sizing Mode Inputs */}
          {mode === "PIPS" ? (
            <div className="space-y-2">
              <Label className="text-xs">Stop Loss Distance (Pips)</Label>
              <Input
                type="number"
                value={slPips || ""}
                onChange={(e) => setSlPips(Number(e.target.value))}
                className="font-mono text-sm"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Entry Price</Label>
                <Input
                  type="number"
                  step="any"
                  value={entryPrice || ""}
                  onChange={(e) => setEntryPrice(Number(e.target.value))}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Stop Loss Price</Label>
                <Input
                  type="number"
                  step="any"
                  value={stopLossPrice || ""}
                  onChange={(e) => setStopLossPrice(Number(e.target.value))}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Calculated Results Panel */}
        <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-muted/20 p-5 space-y-4">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recommended Position Size
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-primary">
                {sizing.lotSize}
              </span>
              <span className="text-sm font-semibold text-muted-foreground">Standard Lots</span>
            </div>
          </div>

          {/* Metric Matrix */}
          <div className="grid grid-cols-2 gap-3 border-t border-border/60 pt-4">
            <div>
              <p className="text-[11px] text-muted-foreground">Cash at Risk</p>
              <p className="text-sm font-bold font-mono text-rose-500">
                ${sizing.riskAmount.toFixed(2)} ({riskPercent}%)
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Effective SL Distance</p>
              <p className="text-sm font-bold font-mono">{sizing.effectiveSlPips} pips</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Contract Units</p>
              <p className="text-sm font-bold font-mono">{sizing.units.toLocaleString()} units</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Mini / Micro Lots</p>
              <p className="text-sm font-bold font-mono">{sizing.miniLots} mini / {sizing.microLots} micro</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Est. Margin (1:100)</p>
              <p className="text-sm font-bold font-mono">${sizing.estimatedMargin.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Pip Value (Per Lot)</p>
              <p className="text-sm font-bold font-mono">${sizing.pipValuePerLot.toFixed(2)}/pip</p>
            </div>
          </div>

          {/* Profit Target Projections */}
          <div className="rounded-lg border border-border bg-background/60 p-3 text-xs space-y-1">
            <p className="font-semibold text-muted-foreground">Reward Targets Projection:</p>
            <div className="flex items-center justify-between font-mono pt-1 text-[11px]">
              <span className="text-emerald-500 font-medium">Target 1 (1:2 R:R): +${(sizing.riskAmount * 2).toFixed(2)}</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Target 2 (1:3 R:R): +${(sizing.riskAmount * 3).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### 4. Create Drawdown Recovery Matrix Card (`components/risk/DrawdownToleranceCard.tsx`)
Create a disciplinarian card displaying consecutive loss survivability and exponential recovery requirements.

**File:** `components/risk/DrawdownToleranceCard.tsx`
```tsx
"use client";

import { useMemo } from "react";
import { TrendingDown, ShieldCheck } from "lucide-react";
import { useSettings } from "@/components/providers/SettingsProvider";
import { calculateDrawdownTable } from "@/lib/riskUtils";

export function DrawdownToleranceCard() {
  const { settings, isLoaded } = useSettings();

  const table = useMemo(() => {
    if (!isLoaded || !settings) return [];
    return calculateDrawdownTable(10000, settings.riskPerTradePercent);
  }, [isLoaded, settings]);

  if (!isLoaded || !settings) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <TrendingDown className="h-5 w-5 text-rose-500" />
        <div>
          <h3 className="font-semibold text-sm">Drawdown Resilience Matrix</h3>
          <p className="text-xs text-muted-foreground">
            Consecutive loss impact at {settings.riskPerTradePercent}% risk per trade.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-border text-[11px] text-muted-foreground">
              <th className="pb-2 font-medium">Losses</th>
              <th className="pb-2 font-medium">Capital</th>
              <th className="pb-2 font-medium">Drawdown</th>
              <th className="pb-2 font-medium">Req. Gain</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {table.map((row) => (
              <tr key={row.losses} className="hover:bg-muted/20">
                <td className="py-1.5 font-semibold">{row.losses} in a row</td>
                <td className="py-1.5">${row.remainingBalance.toLocaleString()}</td>
                <td className="py-1.5 text-rose-500 font-semibold">-{row.drawdownPercent}%</td>
                <td className="py-1.5 text-emerald-500 font-semibold">+{row.requiredRecoveryPercent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 p-2.5 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
        <span>
          Mathematical Law: A 20% drawdown requires a 25% gain to recover. Keeping your risk at {settings.riskPerTradePercent}% guarantees survival through normal statistical drawdown streaks.
        </span>
      </div>
    </div>
  );
}
```

---

### 5. Upgrade Risk Page (`app/(dashboard)/risk/page.tsx`)
Incorporate the live active setups fetch, the Portfolio Exposure Radar, the Advanced Position Calculator, and the Drawdown Resilience Matrix.

**File:** `app/(dashboard)/risk/page.tsx`
```tsx
import { ShieldAlert } from "lucide-react";
import { getActiveSetups } from "@/lib/services/setups";
import { PortfolioExposureRadar } from "@/components/risk/PortfolioExposureRadar";
import { AdvancedPositionCalculator } from "@/components/risk/AdvancedPositionCalculator";
import { RiskRulesCard } from "@/components/risk/RiskRulesCard";
import { DrawdownToleranceCard } from "@/components/risk/DrawdownToleranceCard";

export default async function RiskPage() {
  const activeSetups = await getActiveSetups();

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page Title */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            Institutional Risk Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time portfolio exposure tracking, precise position sizing, and capital preservation.
          </p>
        </div>
      </div>

      {/* Top Section: Live Portfolio Exposure Radar */}
      <PortfolioExposureRadar activeSetups={activeSetups} />

      {/* Main Grid: Calculator & Discipline Cards */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Main Calculator */}
        <div className="space-y-6">
          <AdvancedPositionCalculator />
        </div>

        {/* Sidebar Constraints & Resilience Cards */}
        <div className="space-y-6">
          <RiskRulesCard />
          <DrawdownToleranceCard />
        </div>
      </div>
    </div>
  );
}
```

---

## 🧪 Verification & Testing
1. Navigate to `http://localhost:3000/risk` via the left sidebar.
2. Confirm the **Live Portfolio Risk & Exposure Radar** displays active trade capacity and net currency directional chips.
3. Test the **Institutional Position Sizer**:
   - Toggle between **By Pips** and **By Price**.
   - Switch instruments (e.g. from `EUR/USD` to `XAU/USD` Gold or `USD/JPY`).
   - Click the quick risk preset buttons (`0.5%`, `1.0%`, `1.5%`, `2.0%`) to verify real-time recalculations.
4. Review the **Drawdown Resilience Matrix** in the sidebar to verify consecutive loss calculations against your account risk profile.

