"use client";

import Link from "next/link";
import { FileText, ArrowRight } from "lucide-react";
import type { SessionReport } from "@/types/report";
import { formatClockPHT } from "@/lib/formatters";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LatestReportWidgetProps {
  report: SessionReport | null;
}

export function LatestReportWidget({ report }: LatestReportWidgetProps) {
  if (!report) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 p-5 text-center space-y-2">
        <FileText className="h-6 w-6 text-muted-foreground/40 mx-auto" />
        <p className="text-xs font-medium">No session reports generated yet.</p>
        <Link
          href="/reports"
          className={cn(buttonVariants({ size: "sm", variant: "outline" }), "text-xs h-7")}
        >
          Generate Report
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between border-b border-border pb-2.5">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-xs uppercase tracking-wider">
            Latest AI Intelligence Dispatch
          </h4>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">
          {formatClockPHT(report.timestamp)} PHT
        </span>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-foreground">{report.title}</span>
          <span className="rounded bg-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
            {report.bias}
          </span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {report.executiveSummary}
        </p>
      </div>

      {/* Focus Pairs & Link */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Focus:</span>
          {report.playbook.focusPairs.map((p) => (
            <span key={p} className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-mono font-medium">
              {p}
            </span>
          ))}
        </div>
        <Link
          href="/reports"
          className="text-primary hover:underline text-xs font-semibold inline-flex items-center gap-1"
        >
          Read Briefing <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
