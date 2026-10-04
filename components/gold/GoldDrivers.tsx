"use client";

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { GoldDriver } from "@/types/gold";
import { cn } from "@/lib/utils";

export function GoldDrivers({ drivers }: { drivers: GoldDriver[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {drivers.map((driver, index) => {
        const isBullish = driver.impact === "BULLISH";
        const isBearish = driver.impact === "BEARISH";
        
        return (
          <motion.div
            key={driver.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm text-muted-foreground">{driver.name}</h3>
              <span className={cn(
                "flex h-6 w-6 items-center justify-center rounded-md",
                isBullish ? "bg-emerald-500/10 text-emerald-500" : 
                isBearish ? "bg-rose-500/10 text-rose-500" : "bg-slate-500/10 text-slate-500"
              )}>
                {isBullish ? <TrendingUp className="h-4 w-4" /> : 
                 isBearish ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
              </span>
            </div>
            
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold tabular-nums">{driver.value}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Correlation: <span className="font-medium text-foreground">{driver.correlation}</span>
                </p>
              </div>
              <span className={cn(
                "rounded px-2 py-1 text-xs font-semibold",
                isBullish ? "bg-emerald-500/10 text-emerald-500" : 
                isBearish ? "bg-rose-500/10 text-rose-500" : "bg-slate-500/10 text-slate-500"
              )}>
                {driver.impact}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
