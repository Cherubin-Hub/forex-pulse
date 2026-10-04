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
  // Use our formatter utility to calculate the change safely
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
