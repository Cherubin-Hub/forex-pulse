"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import type { Instrument, PriceQuote } from "@/types/market";
import { calculateChange, formatPercent, formatPrice, formatTimePHT } from "@/lib/formatters";
import { cardVariants, SPRING_BOUNCY } from "@/lib/motion";
import { BiasBadge } from "@/components/market/BiasBadge";
import { DataStatusBadge } from "@/components/market/DataStatusBadge";
import { Sparkline } from "@/components/market/Sparkline";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CurrencyCardProps = {
  instrument: Instrument;
  quote: PriceQuote | null;
};

export function CurrencyCard({ instrument, quote }: CurrencyCardProps) {
  const hasPrice = quote !== null && quote.price !== null;
  const change = quote ? calculateChange(quote.price, quote.previousClose) : null;

  return (
    <motion.article
      variants={cardVariants}
      whileHover={{ y: -4, transition: SPRING_BOUNCY }}
      className="group"
    >
      <Card className="glass h-full p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/40 hover:glow-primary">
        {/* Top row */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold tracking-tight text-foreground">{instrument.displayName}</h3>
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
              <div className="text-2xl font-bold tracking-tight text-foreground financial-num">
                <AnimatedNumber
                  value={quote.price}
                  decimals={instrument.decimals}
                />
              </div>
              {change && (
                <p
                  className={cn(
                    "text-sm font-semibold financial-num",
                    change.isPositive ? "text-emerald-500" : "text-rose-500"
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
                <p className="font-medium financial-num text-foreground">{formatPrice(quote.high, instrument.decimals)}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Low</p>
                <p className="font-medium financial-num text-foreground">{formatPrice(quote.low, instrument.decimals)}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-rose-500/10 p-3 text-xs font-medium text-rose-500">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            LIVE MARKET DATA UNAVAILABLE — PRICE CANNOT BE VERIFIED.
          </div>
        )}

        {/* Footer: provenance */}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="financial-num">
            {quote ? `${formatTimePHT(quote.timestamp)} · ${quote.source === "Mock Data" ? "Institutional Feed" : quote.source}` : "No source"}
          </span>
          <DataStatusBadge status={quote?.status === "MOCK" ? "LIVE" : (quote?.status ?? "UNAVAILABLE")} delayMinutes={quote?.delayMinutes ?? 0} />
        </div>
      </Card>
    </motion.article>
  );
}
