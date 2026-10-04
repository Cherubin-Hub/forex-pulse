"use client";

import { Target } from "lucide-react";
import type { TradingSetup } from "@/types/setup";
import { SetupCard } from "@/components/setups/SetupCard";

export function SetupGrid({ setups }: { setups: TradingSetup[] }) {
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
        <SetupCard key={setup.id} setup={setup} />
      ))}
    </div>
  );
}
