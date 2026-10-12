"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, Clock, XCircle, AlertCircle, Activity, type LucideIcon } from "lucide-react";
import type { SetupStatus, TradingSetup } from "@/types/setup";
import type { PriceQuote } from "@/types/market";
import { INSTRUMENTS } from "@/lib/constants/instruments";
import { formatPrice } from "@/lib/formatters";
import { cardVariants, SPRING_BOUNCY } from "@/lib/motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SetupStatusActions } from "@/components/setups/SetupStatusActions";
import { EditSetupModal } from "@/components/setups/EditSetupModal";
import { ActiveTradeProgressGauge } from "@/components/setups/ActiveTradeProgressGauge";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  SetupStatus,
  { label: string; icon: LucideIcon; variant: "warning" | "info" | "success" | "destructive" | "neutral"; glowClass: string }
> = {
  WAITING_FOR_CONFIRMATION: {
    label: "Waiting",
    icon: Clock,
    variant: "warning",
    glowClass: "hover:border-amber-500/40",
  },
  ENTRY_TRIGGERED: {
    label: "Active",
    icon: Activity,
    variant: "info",
    glowClass: "hover:border-sky-500/40 hover:glow-primary",
  },
  TP_REACHED: {
    label: "Won",
    icon: CheckCircle2,
    variant: "success",
    glowClass: "hover:border-emerald-500/40 hover:glow-success",
  },
  SL_HIT: {
    label: "Lost",
    icon: XCircle,
    variant: "destructive",
    glowClass: "hover:border-rose-500/40 hover:glow-danger",
  },
  INVALIDATED: {
    label: "Invalidated",
    icon: AlertCircle,
    variant: "neutral",
    glowClass: "hover:border-border",
  },
  EXPIRED: {
    label: "Expired",
    icon: Clock,
    variant: "neutral",
    glowClass: "hover:border-border",
  },
};

export function SetupCard({ setup, quote }: { setup: TradingSetup; quote?: PriceQuote | null }) {
  const isLong = setup.direction === "LONG";
  const instrument = INSTRUMENTS.find((i) => i.symbol === setup.symbol);
  const decimals = instrument?.decimals ?? 5;
  const status = STATUS_CONFIG[setup.status];
  const StatusIcon = status.icon;

  return (
    <motion.article
      variants={cardVariants}
      whileHover={{ y: -3, transition: SPRING_BOUNCY }}
      className="group"
    >
      <Card
        className={cn(
          "glass h-full flex flex-col justify-between p-5 transition-all duration-300 shadow-sm hover:shadow-lg",
          status.glowClass
        )}
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md",
                  isLong ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                )}
              >
                {isLong ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              </span>
              <h3 className="font-semibold text-foreground tracking-tight">{setup.symbol}</h3>
              <EditSetupModal setup={setup} />
            </div>

            <Badge variant={status.variant}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>

          {/* Price Levels Grid */}
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Entry Zone</p>
              <p className="font-medium financial-num text-foreground">{formatPrice(setup.entryMin, decimals)}</p>
              <p className="text-xs text-muted-foreground financial-num">{formatPrice(setup.entryMax, decimals)}</p>
            </div>
            <div className="border-l border-border pl-2">
              <p className="text-xs text-muted-foreground">Stop Loss</p>
              <p className="font-medium financial-num text-rose-500">{formatPrice(setup.stopLoss, decimals)}</p>
            </div>
            <div className="border-l border-border pl-2">
              <p className="text-xs text-muted-foreground">Take Profit 1</p>
              <p className="font-medium financial-num text-emerald-500">{formatPrice(setup.takeProfit1, decimals)}</p>
            </div>
          </div>

          {/* Real-time Progress Gauge */}
          <ActiveTradeProgressGauge setup={setup} quote={quote} />

          {/* Confluence Tags */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {setup.confluenceTags.map((tag) => (
              <span
                key={tag}
                className="rounded border border-border bg-card/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Footer & Interactive Transitions */}
        <div className="mt-4 flex flex-col gap-2.5 border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={setup.invalidationRule}>
              Invalidation: {setup.invalidationRule}
            </span>
            <span className="rounded bg-muted/70 px-2 py-0.5 text-[11px] font-mono font-semibold text-foreground">
              R:R 1:{setup.riskReward.toFixed(1)}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end">
            <SetupStatusActions setup={setup} />
          </div>
        </div>
      </Card>
    </motion.article>
  );
}
