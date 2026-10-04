import { CandlestickChart } from "lucide-react";
import { PagePlaceholder } from "@/components/shared/PagePlaceholder";

export default function MarketsPage() {
  return (
    <PagePlaceholder
      icon={CandlestickChart}
      title="Markets"
      description="Live prices, daily change and volatility for all 8 instruments."
      phase="Phase 1"
    />
  );
}
