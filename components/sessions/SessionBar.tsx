"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Clock, Zap } from "lucide-react";
import { useNow } from "@/hooks/useNow";
import { MARKET_SESSIONS } from "@/lib/constants/sessions";
import { getActiveOverlap, getSessionStatus, isForexMarketOpen } from "@/lib/sessions";
import { formatClockPHT } from "@/lib/formatters";
import { SessionCard } from "@/components/sessions/SessionCard";
import { cn } from "@/lib/utils";

export function SessionBar() {
  const now = useNow();

  if (!now) {
    return <div className="h-[212px] animate-pulse rounded-xl border border-border bg-card" />;
  }

  const statuses = MARKET_SESSIONS.map((session) => getSessionStatus(session, now));
  const marketOpen = isForexMarketOpen(now);
  const overlap = marketOpen ? getActiveOverlap(statuses) : null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm"
    >
      {/* Header row */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold tracking-tight">Market Sessions</h2>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              marketOpen
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            )}
          >
            {marketOpen ? "Forex market open" : "Forex market closed — weekend"}
          </span>

          <AnimatePresence>
            {overlap && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400"
              >
                <Zap className="h-3 w-3" />
                {overlap}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground">
          <Clock className="h-4 w-4" />
          {formatClockPHT(now, true)} PHT
        </div>
      </div>

      {/* Session cards */}
      <div className="grid gap-3 md:grid-cols-3">
        {statuses.map((status) => (
          <SessionCard key={status.session.id} status={status} />
        ))}
      </div>
    </motion.section>
  );
}
