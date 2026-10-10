"use client";

import { Megaphone, Landmark, Activity, Sparkles } from "lucide-react";
import type { NewsArticle } from "@/types/news";

interface NewsMetricsSummaryProps {
  articles: NewsArticle[];
}

export function NewsMetricsSummary({ articles }: NewsMetricsSummaryProps) {
  const highImpactCount = articles.filter((a) => a.impact === "HIGH").length;
  
  // Count articles from central banks or monetary authorities
  const centralBankArticles = articles.filter(
    (a) =>
      a.source.toLowerCase().includes("reserve") ||
      a.source.toLowerCase().includes("bank") ||
      a.headline.toLowerCase().includes("rate cut") ||
      a.headline.toLowerCase().includes("powell") ||
      a.headline.toLowerCase().includes("ecb")
  ).length;

  // Identify the most actively mentioned currency
  const currencyCounts: Record<string, number> = {};
  articles.forEach((a) => {
    a.currencies.forEach((c) => {
      currencyCounts[c] = (currencyCounts[c] || 0) + 1;
    });
  });

  const sortedCurrencies = Object.entries(currencyCounts).sort((a, b) => b[1] - a[1]);
  const mostActiveCurrency = sortedCurrencies[0] ? sortedCurrencies[0][0] : "USD";
  const mostActiveCount = sortedCurrencies[0] ? sortedCurrencies[0][1] : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Wire Headlines */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium">Headlines Tracked</span>
          <Activity className="h-4 w-4 text-primary" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <h4 className="text-xl font-bold tracking-tight">{articles.length}</h4>
          <span className="text-xs font-semibold text-muted-foreground">Session Stream</span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Aggregated institutional wire reports</p>
      </div>

      {/* High-Impact Breaking Catalysts */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium">High Impact Wires</span>
          <Megaphone className="h-4 w-4 text-rose-500" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <h4 className="text-xl font-bold tracking-tight text-rose-500">{highImpactCount}</h4>
          <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-500 border border-rose-500/20">
            Market Moving
          </span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Immediate volatility triggers</p>
      </div>

      {/* Central Bank Policy Statements */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium">Central Bank Communications</span>
          <Landmark className="h-4 w-4 text-amber-500" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <h4 className="text-xl font-bold tracking-tight">{centralBankArticles}</h4>
          <span className="text-xs font-semibold text-amber-500">Policy Flow</span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Fed, ECB & BoJ speeches / decisions</p>
      </div>

      {/* Primary Currency Focus */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium">Primary Currency In Focus</span>
          <Sparkles className="h-4 w-4 text-sky-500" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <h4 className="text-xl font-bold tracking-tight text-sky-500">{mostActiveCurrency}</h4>
          <span className="text-xs font-semibold text-muted-foreground">
            {mostActiveCount} mentions
          </span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Highest headline concentration</p>
      </div>
    </div>
  );
}
