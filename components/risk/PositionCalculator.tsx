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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration match pattern
      setRiskPercent(settings.riskPerTradePercent);
    }
  }, [isLoaded, settings]);
  
  // Position Sizing Math
  const riskAmount = balance * (riskPercent / 100);
  
  // Note: This is a simplified approximation. For XXX/USD pairs, 1 standard lot = $10/pip.
  // For JPY quote pairs, it fluctuates based on current exchange rates, roughly $6.50/pip right now.
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
              {/* Using native select styled like shadcn for simplicity */}
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
