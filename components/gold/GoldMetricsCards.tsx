"use client";

import { motion } from "framer-motion";
import { DollarSign, ArrowUpRight, ArrowDownRight, Compass } from "lucide-react";
import type { KeyLevel } from "@/types/gold";
import type { PriceQuote } from "@/types/market";
import { formatPrice } from "@/lib/formatters";
import { cardVariants, SPRING_BOUNCY } from "@/lib/motion";
import { Card } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";

interface GoldMetricsCardsProps {
  quote: PriceQuote | null;
  levels: KeyLevel[];
}

export function GoldMetricsCards({ quote, levels }: GoldMetricsCardsProps) {
  const currentPrice = quote?.price ?? 2650;

  // 1. Calculate 24h Dollar Range
  const high = quote?.high ?? currentPrice + 8;
  const low = quote?.low ?? currentPrice - 6;
  const dollarRange = high - low;

  // 2. Nearest Resistance & Nearest Support
  const resistances = levels.filter((l) => l.type === "RESISTANCE" && l.price > currentPrice);
  const nearestResistance = [...resistances].sort((a, b) => a.price - b.price)[0];
  const distToRes = nearestResistance ? nearestResistance.price - currentPrice : null;

  const supports = levels.filter((l) => l.type === "SUPPORT" && l.price < currentPrice);
  const nearestSupport = [...supports].sort((a, b) => b.price - a.price)[0];
  const distToSup = nearestSupport ? currentPrice - nearestSupport.price : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 24h Dollar Range */}
      <motion.div variants={cardVariants} whileHover={{ y: -2, transition: SPRING_BOUNCY }}>
        <Card className="glass p-4 shadow-sm hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">24h Price Range</span>
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10">
              <DollarSign className="h-3.5 w-3.5 text-amber-500" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <h4 className="text-xl font-bold tracking-tight text-foreground financial-num">
              $<AnimatedNumber value={dollarRange} decimals={2} />
            </h4>
            <span className="text-[11px] font-medium text-muted-foreground financial-num">
              L: ${formatPrice(low, 2)} — H: ${formatPrice(high, 2)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Intra-day volatility corridor</p>
        </Card>
      </motion.div>

      {/* Distance to Resistance */}
      <motion.div variants={cardVariants} whileHover={{ y: -2, transition: SPRING_BOUNCY }}>
        <Card className="glass p-4 shadow-sm hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nearest Resistance</span>
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-500/10">
              <ArrowUpRight className="h-3.5 w-3.5 text-rose-500" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <h4 className="text-xl font-bold tracking-tight text-foreground financial-num">
              ${nearestResistance ? formatPrice(nearestResistance.price, 2) : "—"}
            </h4>
            {distToRes !== null && (
              <span className="text-xs font-semibold text-rose-500 financial-num">
                +<AnimatedNumber value={distToRes} decimals={2} /> pts
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {nearestResistance ? `${nearestResistance.strength} ceiling` : "No ceiling defined"}
          </p>
        </Card>
      </motion.div>

      {/* Distance to Support */}
      <motion.div variants={cardVariants} whileHover={{ y: -2, transition: SPRING_BOUNCY }}>
        <Card className="glass p-4 shadow-sm hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nearest Support</span>
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10">
              <ArrowDownRight className="h-3.5 w-3.5 text-emerald-500" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <h4 className="text-xl font-bold tracking-tight text-foreground financial-num">
              ${nearestSupport ? formatPrice(nearestSupport.price, 2) : "—"}
            </h4>
            {distToSup !== null && (
              <span className="text-xs font-semibold text-emerald-500 financial-num">
                -<AnimatedNumber value={distToSup} decimals={2} /> pts
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {nearestSupport ? `${nearestSupport.strength} floor` : "No floor defined"}
          </p>
        </Card>
      </motion.div>

      {/* DXY Macro Driver Correlation */}
      <motion.div variants={cardVariants} whileHover={{ y: -2, transition: SPRING_BOUNCY }}>
        <Card className="glass p-4 shadow-sm hover:border-sky-500/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">DXY Correlation</span>
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/10">
              <Compass className="h-3.5 w-3.5 text-sky-500" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <h4 className="text-xl font-bold tracking-tight text-foreground financial-num">-0.82</h4>
            <span className="text-xs font-semibold text-sky-500">Strong Inverse</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Dollar strength driver</p>
        </Card>
      </motion.div>
    </div>
  );
}
