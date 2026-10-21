"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import type { Instrument, PriceQuote } from "@/types/market";
import {
  calculateChange,
  formatPercent,
  formatPrice,
  formatTimePHT,
} from "@/lib/formatters";
import { cardVariants, SPRING_BOUNCY } from "@/lib/motion";
import { BiasBadge } from "@/components/market/BiasBadge";
import { DataStatusBadge } from "@/components/market/DataStatusBadge";
import { Sparkline } from "@/components/market/Sparkline";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLiveMarket } from "@/components/providers/AutoTradeAutomationProvider";

type CurrencyCardProps = {
  instrument: Instrument;
  quote: PriceQuote | null;
};

export function CurrencyCard({
  instrument,
  quote: initialQuote,
}: CurrencyCardProps) {
  const { getQuote } = useLiveMarket();
  const liveQuote = getQuote(instrument.symbol);
  const quote = liveQuote ?? initialQuote;

  const [flash, setFlash] = useState<"UP" | "DOWN" | null>(null);
  const prevPriceRef = useRef<number | null>(quote?.price ?? null);

  // Trigger flash animation when live price ticks
  useEffect(() => {
    if (quote?.price === null || quote?.price === undefined) return;
    if (prevPriceRef.current !== null && prevPriceRef.current !== quote.price) {
      const dir = quote.price > prevPriceRef.current ? "UP" : "DOWN";
      setFlash(dir);
      const timer = setTimeout(() => setFlash(null), 900);
      prevPriceRef.current = quote.price;
      return () => clearTimeout(timer);
    }
    prevPriceRef.current = quote.price;
  }, [quote?.price]);

  const hasPrice = quote !== null && quote.price !== null;
  const change = quote
    ? calculateChange(quote.price, quote.previousClose)
    : null;

  const currentHigh =
    quote?.high !== null && quote?.price !== null && quote?.high !== undefined
      ? Math.max(quote.high, quote.price)
      : (quote?.high ?? null);

  const currentLow =
    quote?.low !== null && quote?.price !== null && quote?.low !== undefined
      ? Math.min(quote.low, quote.price)
      : (quote?.low ?? null);

  return (
    <motion.article
      variants={cardVariants}
      whileHover={{ y: -4, transition: SPRING_BOUNCY }}
      className="group"
    >
      <Link
        href={`/markets?symbol=${instrument.symbol}`}
        className="block h-full"
      >
        <Card
          className={cn(
            "glass h-full p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/40 hover:glow-primary cursor-pointer",
            flash === "UP" && "border-emerald-500/40 shadow-emerald-500/10",
            flash === "DOWN" && "border-rose-500/40 shadow-rose-500/10",
          )}
        >
          {/* Top row */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
                {instrument.displayName}
              </h3>
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
                <div
                  className={cn(
                    "text-2xl font-bold tracking-tight text-foreground financial-num transition-colors duration-300 rounded px-1.5 py-0.5 -mx-1.5",
                    flash === "UP" && "bg-emerald-500/15 text-emerald-400",
                    flash === "DOWN" && "bg-rose-500/15 text-rose-400",
                  )}
                >
                  <AnimatedNumber
                    value={quote.price}
                    decimals={instrument.decimals}
                  />
                </div>
                {change && (
                  <p
                    className={cn(
                      "text-sm font-semibold financial-num transition-colors duration-300",
                      change.isPositive ? "text-emerald-500" : "text-rose-500",
                    )}
                  >
                    {formatPercent(change.percent)}
                  </p>
                )}
              </div>

              {/* Sparkline */}
              <Sparkline
                data={quote.sparkline}
                isPositive={change?.isPositive ?? true}
                className="mt-3"
              />

              {/* High / Low */}
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">High</p>
                  <p className="font-medium financial-num text-foreground">
                    {formatPrice(currentHigh, instrument.decimals)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Low</p>
                  <p className="font-medium financial-num text-foreground">
                    {formatPrice(currentLow, instrument.decimals)}
                  </p>
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
              {quote
                ? `${formatTimePHT(quote.timestamp)} · ${quote.source}`
                : "No source"}
            </span>
            <DataStatusBadge
              status={quote?.status ?? "UNAVAILABLE"}
              delayMinutes={quote?.delayMinutes ?? 0}
            />
          </div>
        </Card>
      </Link>
    </motion.article>
  );
}
