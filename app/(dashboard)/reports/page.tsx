import { FileText } from "lucide-react";
import { PagePlaceholder } from "@/components/shared/PagePlaceholder";

export default function ReportsPage() {
  return (
    <PagePlaceholder
      icon={FileText}
      title="Reports"
      description="AI-generated Morning and London session reports."
      phase="Phase 3"
    />
  );
}
