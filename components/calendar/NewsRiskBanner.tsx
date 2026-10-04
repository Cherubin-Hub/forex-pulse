"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Activity } from "lucide-react";
import type { EconomicEvent } from "@/types/calendar";
import { useNow } from "@/hooks/useNow";
import { getActiveNewsRisks, getAffectedInstruments, getEventTiming, getMsUntilEvent } from "@/lib/calendar";
import { formatDuration } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export function NewsRiskBanner({ events }: { events: EconomicEvent[] }) {
  const now = useNow();
  const risks = now ? getActiveNewsRisks(events, now) : [];

  return (
    <AnimatePresence>
      {now && risks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="space-y-2">
            {risks.map((event) => {
              const isImminent = getEventTiming(event, now) === "IMMINENT";
              const affected = getAffectedInstruments(event.currency);
              const Icon = isImminent ? AlertTriangle : Activity;

              return (
                <div
                  key={event.id}
                  role="alert"
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4",
                    isImminent
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  )}
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold">
                      {isImminent
                        ? `HIGH-IMPACT NEWS: ${event.currency} ${event.title} in ${formatDuration(getMsUntilEvent(event, now))}`
                        : `${event.currency} ${event.title} JUST RELEASED — EXPECT VOLATILITY`}
                    </p>
                    <p className="mt-0.5 opacity-90">
                      {isImminent ? "Avoid new entries on: " : "Spreads may widen on: "}
                      {affected.join(", ")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
