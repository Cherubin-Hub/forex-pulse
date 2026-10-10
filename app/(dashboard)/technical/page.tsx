import { Activity } from "lucide-react";
import { getTechnicalAnalysis } from "@/lib/services/technical";
import { getQuotes } from "@/lib/services/marketData";
import { TechnicalConsole } from "@/components/technical/TechnicalConsole";

export default async function TechnicalPage() {
  const [technicals, quotes] = await Promise.all([
    getTechnicalAnalysis(),
    getQuotes(),
  ]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Technical Analysis Command Hub
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Multi-timeframe trend alignment, daily pivot levels, and interactive TradingView charting.
          </p>
        </div>
      </div>

      <TechnicalConsole technicals={technicals} quotes={quotes} />
    </div>
  );
}
