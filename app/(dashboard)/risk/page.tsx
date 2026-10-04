import { ShieldAlert } from "lucide-react";
import { PositionCalculator } from "@/components/risk/PositionCalculator";
import { RiskRulesCard } from "@/components/risk/RiskRulesCard";

export default function RiskPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            Risk Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Calculate your precise position size and respect your account parameters.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main Calculator Area */}
        <div className="space-y-6">
          <PositionCalculator />
        </div>

        {/* Sidebar Constraints Area */}
        <div className="space-y-6">
          <RiskRulesCard />
        </div>
      </div>
    </div>
  );
}
