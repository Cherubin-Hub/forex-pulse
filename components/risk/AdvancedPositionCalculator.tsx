"use client";

import { useState, useEffect, useMemo } from "react";
import { useLiveMarket } from "@/components/providers/AutoTradeAutomationProvider";
import { isVerifiedQuote } from "@/lib/marketQuality";
import { formatPrice } from "@/lib/formatters";
import { Calculator } from "lucide-react";
import { useSettings } from "@/components/providers/SettingsProvider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { INSTRUMENTS } from "@/lib/constants/instruments";
import { calculatePositionSize, type CalculationMode } from "@/lib/riskUtils";

export function AdvancedPositionCalculator() {
  const { settings, isLoaded } = useSettings();

  const balance = settings.accountBalance;
  const { getQuote } = useLiveMarket();
  const [riskPercent, setRiskPercent] = useState<number>(1);
  const [pair, setPair] = useState("EURUSD");
  const [mode, setMode] = useState<CalculationMode>("PIPS");
  const [slPips, setSlPips] = useState<number>(20);
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [stopLossPrice, setStopLossPrice] = useState<number>(0);

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
      leverage: settings.leverage,
      marketPrice: isVerifiedQuote(getQuote(pair))
        ? (getQuote(pair)!.price ?? 0)
        : 0,
    });
  }, [
    balance,
    riskPercent,
    pair,
    mode,
    slPips,
    entryPrice,
    stopLossPrice,
    settings.leverage,
    getQuote,
  ]);

  if (!isLoaded) {
    return (
      <div className="h-[480px] animate-pulse rounded-xl bg-card/50 border border-border" />
    );
  }

  const QUICK_RISKS = [0.5, 1.0, 1.5, 2.0];

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/30 p-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm">
            Institutional Position Sizer
          </h3>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center rounded-lg border border-border bg-background p-0.5">
          <button
            type="button"
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              mode === "PIPS"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setMode("PIPS")}
          >
            By Pips
          </button>
          <button
            type="button"
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              mode === "PRICE"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
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
              readOnly
              title="Set your USD account balance in Settings"
              className="font-mono text-sm"
            />
          </div>

          {/* Quick Risk Buttons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Risk Per Trade (%)</Label>
              <span className="text-xs font-mono font-semibold text-primary">
                {riskPercent}%
              </span>
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
            {sizing.error && (
              <p role="alert" className="mb-3 text-xs text-amber-500">
                {sizing.error}
              </p>
            )}
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recommended Position Size
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-primary">
                {sizing.lotSize}
              </span>
              <span className="text-sm font-semibold text-muted-foreground">
                Standard Lots
              </span>
            </div>
          </div>

          {/* Metric Matrix */}
          <div className="grid grid-cols-2 gap-3 border-t border-border/60 pt-4">
            <div>
              <p className="text-[11px] text-muted-foreground">Cash at Risk</p>
              <p className="text-sm font-bold font-mono text-rose-500">
                ${formatPrice(sizing.actualRiskAmount, 2)} ({riskPercent}%)
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">
                Effective SL Distance
              </p>
              <p className="text-sm font-bold font-mono">
                {sizing.effectiveSlPips} pips
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">
                Contract Units
              </p>
              <p className="text-sm font-bold font-mono">
                {sizing.units.toLocaleString()} units
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">
                Mini / Micro Lots
              </p>
              <p className="text-sm font-bold font-mono">
                {sizing.miniLots} mini / {sizing.microLots} micro
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">
                Est. Margin (1:{settings.leverage})
              </p>
              <p className="text-sm font-bold font-mono">
                ${sizing.estimatedMargin.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">
                Pip Value (Per Lot)
              </p>
              <p className="text-sm font-bold font-mono">
                ${formatPrice(sizing.pipValuePerLot, 2)}/pip
              </p>
            </div>
          </div>

          {/* Profit Target Projections */}
          <div className="rounded-lg border border-border bg-background/60 p-3 text-xs space-y-1">
            <p className="font-semibold text-muted-foreground">
              Reward Targets Projection:
            </p>
            <div className="flex items-center justify-between font-mono pt-1 text-[11px]">
              <span className="text-emerald-500 font-medium">
                Target 1 (1:2 R:R): +$
                {formatPrice(sizing.actualRiskAmount * 2, 2)}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Target 2 (1:3 R:R): +$
                {formatPrice(sizing.actualRiskAmount * 3, 2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
