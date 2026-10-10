import { CandlestickChart } from "lucide-react";
import { getQuotes } from "@/lib/services/marketData";
import { MarketsSummaryCards } from "@/components/market/MarketsSummaryCards";
import { MarketsTable } from "@/components/market/MarketsTable";

export default async function MarketsPage() {
  const quotes = await getQuotes();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CandlestickChart className="h-6 w-6 text-primary" />
            Markets Watchlist
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time price quotes, daily volatility ranges, and momentum across all tracked instruments.
          </p>
        </div>
      </div>

      {/* Top Statistical Cards */}
      <section>
        <MarketsSummaryCards quotes={quotes} />
      </section>

      {/* Comprehensive Watchlist Table */}
      <section className="space-y-3">
        <div>
          <h3 className="text-base font-semibold">Instrument Matrix</h3>
          <p className="text-xs text-muted-foreground">
            Filter by asset class, inspect daily range expansion, and launch technical analysis.
          </p>
        </div>
        <MarketsTable quotes={quotes} />
      </section>
    </div>
  );
}
