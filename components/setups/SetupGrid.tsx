"use client";

import { useMemo } from "react";
import { Target } from "lucide-react";
import type { TradingSetup } from "@/types/setup";
import type { PriceQuote } from "@/types/market";
import { SetupCard } from "@/components/setups/SetupCard";
import { useLiveMarket } from "@/components/providers/AutoTradeAutomationProvider";

interface SetupGridProps {
  setups: TradingSetup[];
  quotes?: PriceQuote[];
}

export function SetupGrid({ setups, quotes = [] }: SetupGridProps) {
  let activeQuotes: PriceQuote[] = quotes;
  try {
    const market = useLiveMarket();
    if (market.quotes.length > 0) activeQuotes = market.quotes;
  } catch {
    // Safe fallback if rendered in isolation
  }

  const quoteMap = useMemo(() => {
    return new Map(activeQuotes.map((q) => [q.symbol, q]));
  }, [activeQuotes]);

  if (setups.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
        <Target className="mb-4 h-10 w-10 opacity-20" />
        <p>No trading setups found.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {setups.map((setup) => (
        <SetupCard
          key={setup.id}
          setup={setup}
          quote={quoteMap.get(setup.symbol)}
        />
      ))}
    </div>
  );
}
