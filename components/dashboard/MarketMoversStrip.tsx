"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Activity, DollarSign } from "lucide-react";
import type { PriceQuote } from "@/types/market";
import { calculateMarketMovers } from "@/lib/dashboardUtils";
import { cardVariants, staggerContainer, SPRING_BOUNCY } from "@/lib/motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MarketMoversStripProps {
  quotes: PriceQuote[];
}

export function MarketMoversStrip({ quotes }: MarketMoversStripProps) {
  const movers = useMemo(() => calculateMarketMovers(quotes), [quotes]);

  return (
    <motion.div
      variants={staggerContainer(0.04)}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      {/* Top Gainer */}
      <motion.div variants={cardVariants} whileHover={{ y: -2, transition: SPRING_BOUNCY }}>
        <Card className="glass p-3 shadow-sm hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Top Gainer (24h)</span>
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/10">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
            </div>
          </div>
          {movers.topGainer ? (
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-sm text-foreground">{movers.topGainer.symbol}</span>
                <span className="text-xs font-bold financial-num text-emerald-500">
                  +{movers.topGainer.changePercent}%
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground financial-num">{movers.topGainer.currentPrice}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Flat market</p>
          )}
        </Card>
      </motion.div>

      {/* Top Decliner */}
      <motion.div variants={cardVariants} whileHover={{ y: -2, transition: SPRING_BOUNCY }}>
        <Card className="glass p-3 shadow-sm hover:border-rose-500/30 transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Top Decliner (24h)</span>
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-rose-500/10">
              <TrendingDown className="h-3 w-3 text-rose-500" />
            </div>
          </div>
          {movers.topDecliner ? (
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-sm text-foreground">{movers.topDecliner.symbol}</span>
                <span className="text-xs font-bold financial-num text-rose-500">
                  {movers.topDecliner.changePercent}%
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground financial-num">{movers.topDecliner.currentPrice}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Flat market</p>
          )}
        </Card>
      </motion.div>

      {/* Highest Volatility */}
      <motion.div variants={cardVariants} whileHover={{ y: -2, transition: SPRING_BOUNCY }}>
        <Card className="glass p-3 shadow-sm hover:border-primary/30 transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">High Volatility</span>
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10">
              <Activity className="h-3 w-3 text-primary" />
            </div>
          </div>
          {movers.mostVolatile ? (
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-sm text-foreground">{movers.mostVolatile.symbol}</span>
                <span className="text-xs font-bold financial-num text-primary">
                  {movers.mostVolatile.spreadPercent}% Spread
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">Daily High/Low Range</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Calm volatility</p>
          )}
        </Card>
      </motion.div>

      {/* Aggregate USD Bias */}
      <motion.div variants={cardVariants} whileHover={{ y: -2, transition: SPRING_BOUNCY }}>
        <Card className="glass p-3 shadow-sm hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">USD Macro Bias</span>
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/10">
              <DollarSign className="h-3 w-3 text-amber-500" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={cn(
                "font-bold text-sm financial-num",
                movers.aggregateUsdBias === "BULLISH"
                  ? "text-emerald-500"
                  : movers.aggregateUsdBias === "BEARISH"
                  ? "text-rose-500"
                  : "text-muted-foreground"
              )}
            >
              {movers.aggregateUsdBias}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">Cross-currency strength</p>
        </Card>
      </motion.div>
    </motion.div>
  );
}
