import { FileText } from "lucide-react";
import { getSessionReports } from "@/lib/services/reports";
import { ReportsView } from "@/components/reports/ReportsView";

export default async function ReportsPage() {
  const reports = await getSessionReports();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Session Reports & Intelligence
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Pre-session institutional briefings, liquidity zones, and risk directives.
          </p>
        </div>
      </div>

      <ReportsView reports={reports} />
    </div>
  );
}
