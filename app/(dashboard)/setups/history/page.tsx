import { History } from "lucide-react";
import { PagePlaceholder } from "@/components/shared/PagePlaceholder";

export default function SetupHistoryPage() {
  return (
    <PagePlaceholder
      icon={History}
      title="Setup History"
      description="Past setups, win rate and performance analytics."
      phase="Phase 2"
    />
  );
}
