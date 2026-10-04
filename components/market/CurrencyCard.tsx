"use client";

import { motion, type Variants } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import type { Instrument, PriceQuote } from "@/types/market";
import { calculateChange, formatPercent, formatPrice, formatTimePHT } from "@/lib/formatters";
import { BiasBadge } from "@/components/market/BiasBadge";
import { DataStatusBadge } from "@/components/market/DataStatusBadge";
import { Sparkline } from "@/components/market/Sparkline";
import { cn } from "@/lib/utils";

export const CARD_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

type CurrencyCardProps = {
  instrument: Instrument;
  quote: PriceQuote | null;
};

export function CurrencyCard({ instrument, quote }: CurrencyCardProps) {
  const hasPrice = quote !== null && quote.price !== null;
  const change = quote ? calculateChange(quote.price, quote.previousClose) : null;

  return (
    <motion.article
      variants={CARD_VARIANTS}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold tracking-tight">{instrument.displayName}</h3>
          <p className="text-xs text-muted-foreground">
            {instrument.category === "COMMODITY" ? "Commodity" : "Major"}
          </p>
        </div>
        {quote && <BiasBadge bias={quote.bias} />}
      </div>

      {hasPrice ? (
        <>
          {/* Price + change */}
          <div className="mt-4 flex items-end justify-between gap-2">
            <p className="text-2xl font-semibold tabular-nums tracking-tight">
              {formatPrice(quote.price, instrument.decimals)}
            </p>
            {change && (
              <p
                className={cn(
                  "text-sm font-medium tabular-nums",
                  change.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                )}
              >
                {formatPercent(change.percent)}
              </p>
            )}
          </div>

          {/* Sparkline */}
          <Sparkline data={quote.sparkline} isPositive={change?.isPositive ?? true} className="mt-3" />

          {/* High / Low */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">High</p>
              <p className="font-medium tabular-nums">{formatPrice(quote.high, instrument.decimals)}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Low</p>
              <p className="font-medium tabular-nums">{formatPrice(quote.low, instrument.decimals)}</p>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-rose-500/10 p-3 text-xs font-medium text-rose-600 dark:text-rose-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          LIVE MARKET DATA UNAVAILABLE — PRICE CANNOT BE VERIFIED.
        </div>
      )}

      {/* Footer: provenance */}
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {quote ? `${formatTimePHT(quote.timestamp)} · ${quote.source}` : "No source"}
        </span>
        <DataStatusBadge status={quote?.status ?? "UNAVAILABLE"} delayMinutes={quote?.delayMinutes ?? 0} />
      </div>
    </motion.article>
  );
}
