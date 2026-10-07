"use client";

import { useState } from "react";
import type { SessionReport } from "@/types/report";
import { ReportCard } from "@/components/reports/ReportCard";
import { Button } from "@/components/ui/button";

export function ReportsView({ reports }: { reports: SessionReport[] }) {
  const [selectedReportId, setSelectedReportId] = useState<string>(
    reports[0]?.id ?? ""
  );

  const activeReport =
    reports.find((r) => r.id === selectedReportId) ?? reports[0];

  return (
    <div className="space-y-6">
      {/* Report Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        {reports.map((report) => {
          const isSelected = report.id === activeReport?.id;
          return (
            <Button
              key={report.id}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              className="text-xs h-8"
              onClick={() => setSelectedReportId(report.id)}
            >
              {report.session.replace("_", " ")}
              <span className="ml-1.5 opacity-60 text-[10px]">
                ({new Date(report.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })})
              </span>
            </Button>
          );
        })}
      </div>

      {/* Render Active Report */}
      {activeReport ? (
        <ReportCard report={activeReport} />
      ) : (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No session reports available.
        </div>
      )}
    </div>
  );
}
