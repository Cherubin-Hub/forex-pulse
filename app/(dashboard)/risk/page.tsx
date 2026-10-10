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
