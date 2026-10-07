import { Activity } from "lucide-react";
import { getTechnicalAnalysis } from "@/lib/services/technical";
import { MTFMatrix } from "@/components/technical/MTFMatrix";
import { TechnicalChartSection } from "@/components/technical/TechnicalChartSection";

export default async function TechnicalPage() {
  const data = await getTechnicalAnalysis();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Technical Analysis
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Multi-timeframe trend alignment, momentum indicators, and live charts.
          </p>
        </div>
      </div>

      {/* Section 1: Multi-Timeframe Matrix */}
      <section className="space-y-3">
        <div>
          <h3 className="text-base font-semibold">MTF Trend Matrix</h3>
          <p className="text-xs text-muted-foreground">
            Look for alignment across D1, H4, and H1 for high-probability setups.
          </p>
        </div>
        
        <MTFMatrix data={data} />
      </section>

      {/* Section 2: Interactive TradingView Chart */}
      <section>
        <TechnicalChartSection />
      </section>
    </div>
  );
}
