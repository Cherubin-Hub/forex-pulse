"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, Clock, XCircle, AlertCircle, Activity, type LucideIcon } from "lucide-react";
import type { SetupStatus, TradingSetup } from "@/types/setup";
import { INSTRUMENTS } from "@/lib/constants/instruments";
import { formatPrice } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<SetupStatus, { label: string; icon: LucideIcon; color: string }> = {
  WAITING_FOR_CONFIRMATION: { label: "Waiting", icon: Clock, color: "text-amber-500 bg-amber-500/10" },
  ENTRY_TRIGGERED: { label: "Active", icon: Activity, color: "text-sky-500 bg-sky-500/10" },
  TP_REACHED: { label: "Won", icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10" },
  SL_HIT: { label: "Lost", icon: XCircle, color: "text-rose-500 bg-rose-500/10" },
  INVALIDATED: { label: "Invalidated", icon: AlertCircle, color: "text-slate-500 bg-slate-500/10" },
  EXPIRED: { label: "Expired", icon: Clock, color: "text-slate-500 bg-slate-500/10" },
};

export function SetupCard({ setup }: { setup: TradingSetup }) {
  const isLong = setup.direction === "LONG";
  const instrument = INSTRUMENTS.find((i) => i.symbol === setup.symbol);
  const decimals = instrument?.decimals ?? 5;
  const status = STATUS_CONFIG[setup.status];
  const StatusIcon = status.icon;

  return (
    <motion.article
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md",
              isLong ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
            )}>
              {isLong ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            </span>
            <h3 className="font-semibold">{setup.symbol}</h3>
          </div>
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", status.color)}>
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </span>
        </div>

        {/* Price Levels */}
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Entry Zone</p>
            <p className="font-medium tabular-nums">{formatPrice(setup.entryMin, decimals)}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{formatPrice(setup.entryMax, decimals)}</p>
          </div>
          <div className="border-l border-border pl-2">
            <p className="text-xs text-muted-foreground">Stop Loss</p>
            <p className="font-medium tabular-nums text-rose-500">{formatPrice(setup.stopLoss, decimals)}</p>
          </div>
          <div className="border-l border-border pl-2">
            <p className="text-xs text-muted-foreground">Take Profit 1</p>
            <p className="font-medium tabular-nums text-emerald-500">{formatPrice(setup.takeProfit1, decimals)}</p>
          </div>
        </div>

        {/* Confluence Tags */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {setup.confluenceTags.map((tag) => (
            <span key={tag} className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
          Invalidation: {setup.invalidationRule}
        </span>
        <span className="rounded bg-muted px-2 py-1 text-xs font-semibold">
          R:R 1:{setup.riskReward.toFixed(1)}
        </span>
      </div>
    </motion.article>
  );
}
