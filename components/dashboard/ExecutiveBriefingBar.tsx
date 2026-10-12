"use client";

import Link from "next/link";
import { ShieldCheck, AlertOctagon, PlusCircle, ArrowUpRight } from "lucide-react";
import type { TradingSetup } from "@/types/setup";
import type { EconomicEvent } from "@/types/calendar";
import { useNow } from "@/hooks/useNow";
import { getNextHighImpactEvent } from "@/lib/calendar";
import { formatDuration } from "@/lib/formatters";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ExecutiveBriefingBarProps {
  activeSetups: TradingSetup[];
  events: EconomicEvent[];
}

export function ExecutiveBriefingBar({ activeSetups, events }: ExecutiveBriefingBarProps) {
  const now = useNow();

  const nextHigh = now ? getNextHighImpactEvent(events, now) : null;
  const isNoTradeZone = nextHigh ? nextHigh.msUntil <= 30 * 60 * 1000 : false;

  return (
    <Card className="glass flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {/* Macro Threat Status */}
        {isNoTradeZone ? (
          <div className="flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 glow-danger animate-pulse">
            <AlertOctagon className="h-4 w-4" />
            <span>NO-TRADE ZONE: {nextHigh?.event.title} in {formatDuration(nextHigh!.msUntil)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 glow-success">
            <ShieldCheck className="h-4 w-4" />
            <span>Macro Horizon Clear</span>
          </div>
        )}

        {/* Portfolio Exposure Status */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground border-l border-border pl-3">
          <span>Active Setups:</span>
          <span className="font-mono font-bold text-foreground financial-num">{activeSetups.length} Open</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        <Link
          href="/risk"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "h-8 text-xs font-semibold gap-1 hover:border-primary/50"
          )}
        >
          Risk Radar
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
        <Link
          href="/setups"
          className={cn(
            buttonVariants({ variant: "default", size: "sm" }),
            "h-8 text-xs font-semibold gap-1.5"
          )}
        >
          <PlusCircle className="h-3.5 w-3.5" />
          Log Setup
        </Link>
      </div>
    </Card>
  );
}
