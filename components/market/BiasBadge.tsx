import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { MarketBias } from "@/types/market";
import { cn } from "@/lib/utils";

const BIAS_CONFIG = {
  BULLISH: {
    label: "Bullish",
    icon: TrendingUp,
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  BEARISH: {
    label: "Bearish",
    icon: TrendingDown,
    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  NEUTRAL: {
    label: "Neutral",
    icon: Minus,
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
} as const;

export function BiasBadge({ bias }: { bias: MarketBias }) {
  const { label, icon: Icon, className } = BIAS_CONFIG[bias];

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", className)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
