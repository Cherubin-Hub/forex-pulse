import { LineChart } from "lucide-react";
import { PagePlaceholder } from "@/components/shared/PagePlaceholder";

export default function TechnicalPage() {
  return (
    <PagePlaceholder
      icon={LineChart}
      title="Technical Analysis"
      description="EMA, RSI, MACD, ATR and market structure across D1/H4/H1/M15."
      phase="Phase 2"
    />
  );
}
