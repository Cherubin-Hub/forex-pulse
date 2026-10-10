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
          <p className="text-xs text-muted-foreground mt-1">Try clearing your search query or selecting &quot;ALL&quot; currencies.</p>
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
