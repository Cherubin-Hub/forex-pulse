"use client";

import { motion } from "framer-motion";
import type { SessionStatus } from "@/types/session";
import { formatClockPHT, formatDuration } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

export function SessionCard({ status, isFocused }: { status: SessionStatus; isFocused: boolean }) {
  const { session, isOpen, opensAt, closesAt, progress, msUntilChange } = status;

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors",
        isOpen ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-background/50"
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            {session.name}
            {isFocused && (
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-label="Your session" />
            )}
          </p>
          <p className="text-xs text-muted-foreground">{session.city}</p>
        </div>

        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
            isOpen
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-muted text-muted-foreground"
          )}
        >
          <span className="relative flex h-1.5 w-1.5">
            {isOpen && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            )}
            <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", isOpen ? "bg-emerald-500" : "bg-muted-foreground")} />
          </span>
          {isOpen ? "Open" : "Closed"}
        </span>
      </div>

      <p className="mt-3 text-xs tabular-nums text-muted-foreground">
        {formatClockPHT(opensAt)} – {formatClockPHT(closesAt)} PHT
      </p>

      <p className="mt-1 text-sm font-medium tabular-nums">
        {isOpen ? "Closes in " : "Opens in "}
        <span className={isOpen ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}>
          {formatDuration(msUntilChange)}
        </span>
      </p>

      {/* Progress bar */}
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-emerald-500"
          initial={false}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
