import { CalendarDays } from "lucide-react";
import { PagePlaceholder } from "@/components/shared/PagePlaceholder";

export default function CalendarPage() {
  return (
    <PagePlaceholder
      icon={CalendarDays}
      title="Economic Calendar"
      description="High-impact events: NFP, CPI, FOMC and central bank decisions."
      phase="Phase 1"
    />
  );
}
