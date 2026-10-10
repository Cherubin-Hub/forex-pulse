# Step 30: News Sentiment Radar & Multi-Currency Filter Hub

## 🎯 Objective
Elevate the Market News module (`/news`) from a static list into an interactive fundamental analysis tool. The upgraded system adds a Macro News Radar metric strip (High-Impact Count, Central Bank Wire Tally, and Most Mentioned Currency), an interactive multi-currency filter toolbar (`USD`, `EUR`, `GBP`, `JPY`, `AUD`, `XAU`), impact level filtering (`High Only`, `Medium +`, `All`), and instant client-side keyword search.

---

## 🛠 Step-by-Step Implementation

### 1. Create News Sentiment Radar Metric Strip (`components/news/NewsMetricsSummary.tsx`)
Create a high-level fundamental intelligence strip summarizing the volume of incoming news, high-impact alerts, central bank policy wires, and currency concentration.

**File:** `components/news/NewsMetricsSummary.tsx`
```tsx
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
```

#### Why this was written this way:
- **Instant Fundamental Diagnostics:** Before scrolling through individual headlines, traders immediately gauge how many market-moving high-impact wires are active and which currency is receiving the highest headline volume.
- **Dynamic Calculation:** Aggregates statistics directly from the articles array, avoiding duplicate backend calls or state management bugs.

---

### 2. Upgrade News Feed with Filter Toolbar & Search (`components/news/NewsFeed.tsx`)
Refactor the `NewsFeed` component to include client-side impact filters, currency chip selectors, keyword search, and an empty state.

**File:** `components/news/NewsFeed.tsx`
```tsx
"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Megaphone, Newspaper, ExternalLink, Search, Filter } from "lucide-react";
import type { NewsArticle, NewsImpact } from "@/types/news";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ImpactFilter = "ALL" | NewsImpact;

const CURRENCIES = ["ALL", "USD", "EUR", "GBP", "JPY", "AUD", "XAU"];

function getRelativeTime(dateString: string) {
  const now = new Date().getTime();
  const published = new Date(dateString).getTime();
  const diffHours = Math.floor((now - published) / (1000 * 60 * 60));
  
  if (diffHours === 0) return "Just now";
  if (diffHours === 1) return "1 hour ago";
  return `${diffHours} hours ago`;
}

export function NewsFeed({ articles }: { articles: NewsArticle[] }) {
  const [selectedImpact, setSelectedImpact] = useState<ImpactFilter>("ALL");
  const [selectedCurrency, setSelectedCurrency] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      // Impact match
      const matchesImpact =
        selectedImpact === "ALL" || article.impact === selectedImpact;

      // Currency match
      const matchesCurrency =
        selectedCurrency === "ALL" || article.currencies.includes(selectedCurrency);

      // Search match
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        query === "" ||
        article.headline.toLowerCase().includes(query) ||
        article.summary.toLowerCase().includes(query) ||
        article.source.toLowerCase().includes(query);

      return matchesImpact && matchesCurrency && matchesSearch;
    });
  }, [articles, selectedImpact, selectedCurrency, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Filters & Search Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Impact Filter Buttons */}
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 p-1">
            <Button
              size="sm"
              variant={selectedImpact === "ALL" ? "default" : "ghost"}
              className="h-7 px-3 text-xs font-semibold"
              onClick={() => setSelectedImpact("ALL")}
            >
              All Wires ({articles.length})
            </Button>
            <Button
              size="sm"
              variant={selectedImpact === "HIGH" ? "default" : "ghost"}
              className="h-7 px-3 text-xs font-semibold text-rose-500"
              onClick={() => setSelectedImpact("HIGH")}
            >
              High Impact
            </Button>
            <Button
              size="sm"
              variant={selectedImpact === "MEDIUM" ? "default" : "ghost"}
              className="h-7 px-3 text-xs font-semibold text-amber-500"
              onClick={() => setSelectedImpact("MEDIUM")}
            >
              Medium
            </Button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Filter headlines or source..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {/* Currency Tags Filter Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-border/60">
          <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground mr-1.5">
            <Filter className="h-3 w-3" /> Currency:
          </span>
          {CURRENCIES.map((curr) => {
            const isSelected = selectedCurrency === curr;
            return (
              <Button
                key={curr}
                size="sm"
                variant={isSelected ? "secondary" : "outline"}
                className={cn(
                  "h-6 px-2.5 text-[11px] font-semibold",
                  isSelected && "border-primary text-primary"
                )}
                onClick={() => setSelectedCurrency(curr)}
              >
                {curr}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Article Stream */}
      {filteredArticles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-12 text-center text-muted-foreground">
          <Newspaper className="h-8 w-8 opacity-20 mb-2" />
          <p className="text-sm font-medium">No market news matches your filter.</p>
          <p className="text-xs text-muted-foreground mt-1">Try clearing your search query or selecting &quot;All&quot; currencies.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredArticles.map((article, index) => {
            const isHigh = article.impact === "HIGH";
            const isMedium = article.impact === "MEDIUM";

            return (
              <motion.article
                key={article.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Visual Impact Accent Bar on Left Edge */}
                <div
                  className={cn(
                    "absolute left-0 top-0 bottom-0 w-1.5",
                    isHigh ? "bg-rose-500" : isMedium ? "bg-amber-500" : "bg-slate-500"
                  )}
                />

                <div className="flex-1 pl-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={cn(
                          "flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border",
                          isHigh
                            ? "border-rose-500/30 text-rose-500 bg-rose-500/10"
                            : isMedium
                            ? "border-amber-500/30 text-amber-500 bg-amber-500/10"
                            : "border-slate-500/30 text-slate-500 bg-slate-500/10"
                        )}
                      >
                        {isHigh ? <Megaphone className="h-3 w-3" /> : <Newspaper className="h-3 w-3" />}
                        {article.impact} IMPACT
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        {article.source}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                      {getRelativeTime(article.publishedAt)}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold leading-tight mb-2 text-foreground">
                    {article.headline}
                  </h3>

                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    {article.summary}
                  </p>

                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                    <div className="flex gap-1.5">
                      {article.currencies.map((currency) => (
                        <span
                          key={currency}
                          className="text-[11px] font-mono font-semibold bg-muted px-2 py-0.5 rounded text-foreground border border-border/60"
                        >
                          {currency}
                        </span>
                      ))}
                    </div>

                    <span className="text-xs font-medium text-primary flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      Wire Flash <ExternalLink className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

#### Why this was written this way:
- **Comprehensive Multi-Dimensional Filtering:** Traders can combine criteria simultaneously (e.g., `USD` currency + `High Impact` + search term `"Powell"`).
- **Graceful Empty State Handling:** Avoids an empty blank screen when active filters return zero matches, giving clear feedback on how to reset.
- **Left Edge Visual Bar:** High-impact articles feature a bold rose/red border, medium-impact articles feature an amber border, and low-impact articles feature slate, enabling split-second headline triaging.

---

### 3. Upgrade Market News Dashboard Page Route (`app/(dashboard)/news/page.tsx`)
Assemble the upgraded page incorporating the sentiment metric strip and interactive feed.

**File:** `app/(dashboard)/news/page.tsx`
```tsx
import { Newspaper } from "lucide-react";
import { getNews } from "@/lib/services/news";
import { NewsMetricsSummary } from "@/components/news/NewsMetricsSummary";
import { NewsFeed } from "@/components/news/NewsFeed";

export default async function NewsPage() {
  const news = await getNews();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Newspaper className="h-6 w-6 text-primary" />
            Macroeconomic News & Wire Feeds
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time central bank communications, geopolitical breaking news, and currency catalysts.
          </p>
        </div>
      </div>

      {/* Section 1: News Sentiment & Flow Radar */}
      <section>
        <NewsMetricsSummary articles={news} />
      </section>

      {/* Section 2: Interactive News Feed with Currency & Impact Filtering */}
      <section className="space-y-3">
        <div>
          <h3 className="text-base font-semibold">Institutional Wire Feed</h3>
          <p className="text-xs text-muted-foreground">
            Filter headlines by impact, isolate specific currency exposure, or search keywords.
          </p>
        </div>
        <NewsFeed articles={news} />
      </section>
    </div>
  );
}
```

#### Why this was written this way:
- **Server Component Speed:** Fetches articles on the server (`await getNews()`) and streams pre-rendered HTML to the client for immediate rendering.
- **Sectioned Layout Hierarchy:** Separates high-level statistical flow (Radar Strip) from granular headline inspection (Interactive Feed).

---

## 🧪 Verification & Testing
1. Navigate to `http://localhost:3000/news` via the left sidebar.
2. Confirm the 4 radar metric cards render with Total Headlines, High Impact count, Central Bank communications tally, and Primary Currency in focus.
3. Click through the Impact buttons (`High Impact`, `Medium`, `All Wires`) and verify that articles filter in real time.
4. Click on the Currency pills (`USD`, `EUR`, `GBP`, `JPY`, `XAU`) and confirm only headlines mentioning that currency appear.
5. Type in the search box (e.g. `"Powell"` or `"ECB"`) and verify that matches highlight instantly.

