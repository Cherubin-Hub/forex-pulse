import { Coins } from "lucide-react";
import { PagePlaceholder } from "@/components/shared/PagePlaceholder";

export default function GoldPage() {
  return (
    <PagePlaceholder
      icon={Coins}
      title="Gold"
      description="XAU/USD analysis and drivers."
      phase="Phase 1"
    />
  );
}
