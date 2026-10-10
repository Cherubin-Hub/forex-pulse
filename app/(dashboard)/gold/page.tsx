import { getGoldDrivers, getGoldKeyLevels } from "@/lib/services/gold";
import { getQuotes } from "@/lib/services/marketData";
import { GoldDrivers } from "@/components/gold/GoldDrivers";
import { KeyLevels } from "@/components/gold/KeyLevels";
import { GoldMetricsCards } from "@/components/gold/GoldMetricsCards";
import { GoldChartSection } from "@/components/gold/GoldChartSection";
import { formatPrice, calculateChange, formatPercent } from "@/lib/formatters";
import { TrendingUp, TrendingDown, Coins } from "lucide-react";

export default async function GoldPage() {
  const [drivers, levels, quotes] = await Promise.all([
    getGoldDrivers(),
    getGoldKeyLevels(),
    getQuotes(),
  ]);

  const goldQuote = quotes.find((q) => q.symbol === "XAUUSD") ?? null;
  const changeObj = goldQuote ? calculateChange(goldQuote.price, goldQuote.previousClose) : null;

  return (
    <div className="space-y-8">
      {/* Header section with live price badge */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Coins className="h-6 w-6 text-amber-500" />
            <span className="text-amber-500">Gold (XAU/USD)</span> Analysis Hub
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Macro drivers, real yields correlation, key market structure, and live candlestick charting.
          </p>
        </div>

        {goldQuote && goldQuote.price !== null && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm">
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Spot Price (USD)</p>
              <p className="text-xl font-bold tabular-nums tracking-tight">
                ${formatPrice(goldQuote.price, 2)}
              </p>
            </div>
            {changeObj && (
              <div
                className={`flex flex-col items-end ${
                  changeObj.isPositive ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                {changeObj.isPositive ? (
                  <TrendingUp className="h-4 w-4 mb-0.5" />
                ) : (
                  <TrendingDown className="h-4 w-4 mb-0.5" />
                )}
                <span className="text-xs font-bold tabular-nums">
                  {formatPercent(changeObj.percent)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 1: Gold Volatility & Pivot Distance Strip */}
      <section>
        <GoldMetricsCards quote={goldQuote} levels={levels} />
      </section>

      {/* Section 2: Macro Drivers */}
      <section className="space-y-3">
        <div>
          <h3 className="text-base font-semibold">Macroeconomic Drivers</h3>
          <p className="text-xs text-muted-foreground">
            Fundamental forces governing long-term institutional demand and gold price trajectory.
          </p>
        </div>
        <GoldDrivers drivers={drivers} />
      </section>

      {/* Section 3: Technical Structure & Live TradingView Chart */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Key Levels (1 col on desktop) */}
        <div className="lg:col-span-1">
          <KeyLevels levels={levels} />
        </div>

        {/* Right Column: Live TradingView Candlestick Chart (2 cols on desktop) */}
        <div className="lg:col-span-2">
          <GoldChartSection />
        </div>
      </section>
    </div>
  );
}
