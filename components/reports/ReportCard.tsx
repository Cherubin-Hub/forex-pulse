"use client";

import { useTransition } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { 
  ShieldAlert, 
  Target, 
  Flame, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus,
  Trash2,
  Loader2
} from "lucide-react";
import type { SessionReport, MarketBias, VolatilityExpectation } from "@/types/report";
import { formatTimePHT } from "@/lib/formatters";
import { deleteSessionReport } from "@/app/actions/reportActions";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function getBiasBadge(bias: MarketBias): { label: string; variant: "success" | "destructive" | "warning" | "info" | "neutral" } {
  switch (bias) {
    case "BULLISH_USD":
      return { label: "Bullish USD", variant: "success" };
    case "BEARISH_USD":
      return { label: "Bearish USD", variant: "destructive" };
    case "RISK_OFF":
      return { label: "Risk-Off Flight", variant: "warning" };
    case "RISK_ON":
      return { label: "Risk-On Expansion", variant: "info" };
    default:
      return { label: "Neutral / Ranging", variant: "neutral" };
  }
}

function getVolatilityBadge(vol: VolatilityExpectation): { label: string; color: string } {
  switch (vol) {
    case "EXTREME":
      return { label: "Extreme Volatility", color: "text-rose-500" };
    case "HIGH":
      return { label: "High Volatility", color: "text-amber-500" };
    case "NORMAL":
      return { label: "Normal Volatility", color: "text-sky-500" };
    default:
      return { label: "Low Volatility", color: "text-muted-foreground" };
  }
}

export function ReportCard({ report }: { report: SessionReport }) {
  const [isDeleting, startDelete] = useTransition();
  const bias = getBiasBadge(report.bias);
  const vol = getVolatilityBadge(report.volatility);

  const handleDelete = () => {
    if (!confirm("Are you sure you want to delete this session report?")) return;
    startDelete(async () => {
      const result = await deleteSessionReport(report.id);
      if (result.success) {
        toast.success("Session Report Deleted");
      } else {
        toast.error(`Failed to delete: ${result.error}`);
      }
    });
  };

  return (
    <Card className="glass shadow-sm space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">{report.session}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground financial-num">{formatTimePHT(report.timestamp)} PHT</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground mt-0.5">{report.title}</h2>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={bias.variant}>{bias.label}</Badge>
          <span className={cn("text-xs font-semibold flex items-center gap-1", vol.color)}>
            <Flame className="h-3.5 w-3.5" />
            {vol.label}
          </span>
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-muted-foreground hover:text-destructive"
            title="Delete Report"
          >
            {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Executive Brief</h3>
        <p className="text-sm leading-relaxed text-foreground/90">{report.executiveSummary}</p>
      </div>

      {/* Macro Catalysts */}
      {report.macroCatalysts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Macro Catalysts & Drivers</h3>
          <ul className="space-y-1.5 text-xs text-foreground/80">
            {report.macroCatalysts.map((catalyst, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">•</span>
                <span>{catalyst}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Focus Pairs & Risk Rule */}
      <div className="grid sm:grid-cols-2 gap-4 rounded-lg bg-muted/30 p-4 border border-border">
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-primary" />
            Focus Watchlist
          </h4>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {report.playbook.focusPairs.map((pair) => (
              <span key={pair} className="rounded bg-background border border-border px-2 py-0.5 font-mono text-xs font-semibold">
                {pair}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
            Risk Mandate
          </h4>
          <p className="text-xs text-foreground/90 pt-1 leading-snug">{report.playbook.riskRule}</p>
        </div>
      </div>
    </Card>
  );
}
