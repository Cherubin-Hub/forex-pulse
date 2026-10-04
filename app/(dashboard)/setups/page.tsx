import { Target } from "lucide-react";
import { PagePlaceholder } from "@/components/shared/PagePlaceholder";

export default function SetupsPage() {
  return (
    <PagePlaceholder
      icon={Target}
      title="Trading Setups"
      description="Active setups with entry, SL, TP and live status tracking."
      phase="Phase 2"
    />
  );
}
