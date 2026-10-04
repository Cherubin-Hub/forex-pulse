"use client";

import { motion } from "framer-motion";
import type { KeyLevel } from "@/types/gold";
import { formatPrice } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export function KeyLevels({ levels }: { levels: KeyLevel[] }) {
  // Always render resistance on top, support on bottom
  const sortedLevels = [...levels].sort((a, b) => b.price - a.price);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/30">
        <h3 className="font-semibold text-sm">Key Technical Levels</h3>
      </div>
      <div className="divide-y divide-border">
        {sortedLevels.map((level, index) => (
          <motion.div
            key={level.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
          >
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-xs font-bold w-6",
                  level.type === "RESISTANCE" ? "text-rose-500" : 
                  level.type === "SUPPORT" ? "text-emerald-500" : "text-sky-500"
                )}>
                  {level.id.toUpperCase()}
                </span>
                <span className="font-medium tabular-nums">{formatPrice(level.price, 2)}</span>
              </div>
              {level.notes && (
                <span className="text-xs text-muted-foreground mt-1">{level.notes}</span>
              )}
            </div>
            
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider",
              level.strength === "STRONG" ? "border-amber-500/30 text-amber-500 bg-amber-500/10" :
              level.strength === "MODERATE" ? "border-slate-500/30 text-slate-500 bg-slate-500/10" :
              "border-border text-muted-foreground"
            )}>
              {level.strength}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
