import { ShieldAlert } from "lucide-react";
import { PagePlaceholder } from "@/components/shared/PagePlaceholder";

export default function RiskPage() {
  return (
    <PagePlaceholder
      icon={ShieldAlert}
      title="Risk Management"
      description="Position size calculator and risk rules."
      phase="Phase 2"
    />
  );
}
