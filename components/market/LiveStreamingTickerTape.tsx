"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Pause, Play, TrendingUp, TrendingDown } from "lucide-react";
import { MOCK_QUOTES } from "@/lib/mock/quotes";
import type { PriceQuote } from "@/types/market";
import { buildTickerFeed, type TickerItemData } from "@/lib/tickerUtils";
import { formatPrice } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export function LiveStreamingTickerTape() {
  const [quotes, setQuotes] = useState<PriceQuote[]>(MOCK_QUOTES);
  const [prevPrices, setPrevPrices] = useState<Record<string, number>>({});
  const [flashingSymbols, setFlashingSymbols] = useState<Record<string, "UP" | "DOWN">>({});
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Client-side simulated micro-tick engine (interbank price pulse)
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setQuotes((currentQuotes) => {
        // Pick 1 random instrument to update
        const targetIndex = Math.floor(Math.random() * currentQuotes.length);
        const target = currentQuotes[targetIndex];
        if (!target || target.price === null) return currentQuotes;

        const isJpyOrGold = target.symbol === "USDJPY" || target.symbol === "XAUUSD";
        const deltaPip = (Math.random() * 0.8 - 0.4) * (isJpyOrGold ? 0.05 : 0.00008);
        const nextPrice = Number(
          (target.price + deltaPip).toFixed(
            target.symbol === "USDJPY" ? 3 : target.symbol === "XAUUSD" ? 2 : 5
          )
        );

        const dir: "UP" | "DOWN" = nextPrice >= target.price ? "UP" : "DOWN";

        // Save previous price for tick direction
        setPrevPrices((prev) => ({
          ...prev,
          [target.symbol]: target.price as number,
        }));

        // Flash badge for 1.2 seconds
        setFlashingSymbols((prev) => ({
          ...prev,
          [target.symbol]: dir,
        }));

        setTimeout(() => {
          setFlashingSymbols((prev) => {
            const next = { ...prev };
            delete next[target.symbol];
            return next;
          });
        }, 1200);

        return currentQuotes.map((q, idx) => (idx === targetIndex ? { ...q, price: nextPrice } : q));
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [isPaused]);

  const tickerItems = useMemo(() => {
    return buildTickerFeed(quotes, prevPrices);
  }, [quotes, prevPrices]);

  const shouldAnimate = !isPaused && !isHovered;

  return (
    <div
      className="relative flex h-9 items-center border-b border-border bg-card/60 backdrop-blur-sm text-xs select-none overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Institutional Live Feed Status Badge */}
      <div className="z-10 flex h-full items-center gap-1.5 border-r border-border bg-card px-3 shrink-0 shadow-sm">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="font-mono text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          LIVE TAPE
        </span>
        <button
          type="button"
          onClick={() => setIsPaused((prev) => !prev)}
          className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
          title={isPaused ? "Resume Live Stream" : "Pause Live Stream"}
        >
          {isPaused ? <Play className="h-3 w-3 text-amber-500" /> : <Pause className="h-3 w-3" />}
        </button>
      </div>

      {/* Marquee Ticker Track powered by Framer Motion infinite loop */}
      <motion.div
        className="flex items-center gap-6 whitespace-nowrap px-4"
        animate={shouldAnimate ? { x: ["0%", "-50%"] } : false}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: 35,
            ease: "linear",
          },
        }}
      >
        {/* Render items duplicated to produce infinite continuous flow */}
        {[...tickerItems, ...tickerItems].map((item: TickerItemData, index: number) => {
          const flash = flashingSymbols[item.symbol];
          const isUp = item.changePips >= 0;

          return (
            <Link
              key={`${item.symbol}-${index}`}
              href={`/markets?symbol=${item.symbol}`}
              className={cn(
                "inline-flex items-center gap-2 rounded px-2 py-0.5 transition-all hover:bg-muted/50 cursor-pointer shrink-0",
                flash === "UP" && "bg-emerald-500/20 text-emerald-400",
                flash === "DOWN" && "bg-rose-500/20 text-rose-400"
              )}
            >
              <span className="font-mono font-bold text-foreground">{item.displayName}</span>

              {/* Price with flash indicators */}
              <span className="font-mono text-[11px] text-foreground font-semibold">
                {formatPrice(item.price, item.decimals)}
              </span>

              {/* Pip & Percentage Change */}
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-mono text-[10px] font-medium",
                  isUp ? "text-emerald-500" : "text-rose-500"
                )}
              >
                {isUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                {isUp ? `+${item.changePips}` : `${item.changePips}`}p
              </span>

              {/* Spread pill */}
              <span className="text-[9px] font-mono text-muted-foreground/70 bg-muted/40 px-1 py-0.5 rounded border border-border/40">
                {item.spreadPips}p
              </span>
            </Link>
          );
        })}
      </motion.div>
    </div>
  );
}
