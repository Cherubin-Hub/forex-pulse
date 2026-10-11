"use client";

import { useMemo } from "react";
import { Target } from "lucide-react";
import type { TradingSetup } from "@/types/setup";
import type { PriceQuote } from "@/types/market";
import { SetupCard } from "@/components/setups/SetupCard";

interface SetupGridProps {
  setups: TradingSetup[];
  quotes?: PriceQuote[];
}

export function SetupGrid({ setups, quotes = [] }: SetupGridProps) {
  const quoteMap = useMemo(() => {
    return new Map(quotes.map((q) => [q.symbol, q]));
  }, [quotes]);

  if (setups.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
        <Target className="mb-4 h-10 w-10 opacity-20" />
        <p>No trading setups found.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
