"use client";

import { motion } from "framer-motion";
import { Megaphone, Newspaper, ExternalLink } from "lucide-react";
import type { NewsArticle } from "@/types/news";
import { cn } from "@/lib/utils";

// A small helper to show "2 hours ago" without installing external libraries like date-fns
function getRelativeTime(dateString: string) {
  const now = new Date().getTime();
  const published = new Date(dateString).getTime();
  const diffHours = Math.floor((now - published) / (1000 * 60 * 60));
  
  if (diffHours === 0) return "Just now";
  if (diffHours === 1) return "1 hour ago";
  return `${diffHours} hours ago`;
}

export function NewsFeed({ articles }: { articles: NewsArticle[] }) {
  return (
    <div className="flex flex-col gap-4">
      {articles.map((article, index) => {
        const isHigh = article.impact === "HIGH";
        const isMedium = article.impact === "MEDIUM";
        
        return (
          <motion.article
            key={article.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group flex flex-col sm:flex-row gap-4 rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
          >
            {/* A subtle color bar on the left edge for quick impact recognition */}
            <div className={cn(
              "absolute left-0 top-0 bottom-0 w-1",
              isHigh ? "bg-rose-500" : isMedium ? "bg-amber-500" : "bg-slate-500"
            )} />

            <div className="flex-1 pl-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn(
                    "flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border",
                    isHigh ? "border-rose-500/30 text-rose-500 bg-rose-500/10" : 
                    isMedium ? "border-amber-500/30 text-amber-500 bg-amber-500/10" : 
                    "border-slate-500/30 text-slate-500 bg-slate-500/10"
                  )}>
                    {isHigh ? <Megaphone className="h-3 w-3" /> : <Newspaper className="h-3 w-3" />}
                    {article.impact} IMPACT
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    {article.source}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {getRelativeTime(article.publishedAt)}
                </span>
              </div>
              
              <h3 className="text-base font-semibold leading-tight mb-2">
                {article.headline}
              </h3>
              
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {article.summary}
              </p>

              <div className="flex items-center justify-between mt-auto">
                <div className="flex gap-1.5">
                  {article.currencies.map(currency => (
                    <span key={currency} className="text-xs font-medium bg-muted px-2 py-0.5 rounded">
                      {currency}
                    </span>
                  ))}
                </div>
                
                {/* Visual affordance for reading full article */}
                <button className="text-xs font-medium text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Read source <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}
