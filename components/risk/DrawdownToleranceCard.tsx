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
