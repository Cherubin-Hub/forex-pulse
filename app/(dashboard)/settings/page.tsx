import { Settings } from "lucide-react";
import { PagePlaceholder } from "@/components/shared/PagePlaceholder";

export default function SettingsPage() {
  return (
    <PagePlaceholder
      icon={Settings}
      title="Settings"
      description="Trader profile, risk parameters, session focus and news sensitivity."
      phase="Phase 1"
    />
  );
}
