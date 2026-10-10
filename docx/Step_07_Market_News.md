# Step 7: Market News & Sentiment Intelligence Feed

## 🎯 Overview
In this step, we implement the real-time macroeconomic news feed. News items are coded by market impact tier (High, Medium, Low), currency relevance, and relative publishing timestamp to keep traders informed of breaking central bank decisions and geopolitical developments.

---

### 1. News Data Models (`types/news.ts`)

**File:** `types/news.ts`
```typescript
export type NewsImpact = "HIGH" | "MEDIUM" | "LOW";

export interface NewsArticle {
  id: string;
  headline: string;
  summary: string;
  source: string;
  publishedAt: string; // ISO 8601
  impact: NewsImpact;
  currencies: string[]; // e.g. ["USD", "EUR"]
  url?: string;
}
```

---

### 2. Service Layer Controller (`lib/services/news.ts`)

**File:** `lib/services/news.ts`
```typescript
import type { NewsArticle } from "@/types/news";
import { MOCK_NEWS } from "@/lib/mock/news";

export async function getNews(): Promise<NewsArticle[]> {
  // We sort the news so the newest articles are always at the top of the array
  return [...MOCK_NEWS].sort((a, b) => 
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}
```

#### Why this was written this way:
- **Immutable Sorting:** `[...MOCK_NEWS]` creates a shallow copy before sorting, preventing unintended in-place mutation of the underlying data store.

---

### 3. Impact-Coded News Feed Component (`components/news/NewsFeed.tsx`)

**File:** `components/news/NewsFeed.tsx`
```tsx
"use client";

import { motion } from "framer-motion";
import { Megaphone, Newspaper, ExternalLink } from "lucide-react";
import type { NewsArticle } from "@/types/news";
import { cn } from "@/lib/utils";

// Native helper to show relative time without installing external libraries
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
            {/* Visual color bar on the left edge for quick impact recognition */}
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
```

---

### 4. News Page Container (`app/(dashboard)/news/page.tsx`)

**File:** `app/(dashboard)/news/page.tsx`
```tsx
import { getNews } from "@/lib/services/news";
import { NewsFeed } from "@/components/news/NewsFeed";
import { Newspaper } from "lucide-react";

export default async function NewsPage() {
  const news = await getNews();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Newspaper className="h-6 w-6 text-primary" />
            Market News
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time macroeconomic headlines and central bank communications.
          </p>
        </div>
      </div>

      <NewsFeed articles={news} />
    </div>
  );
}
```

#### Why this was written this way:
- **Visual Impact Affordance:** Left color bars (Rose for High, Amber for Medium, Slate for Low) allow traders to scan the feed instantly during fast-moving trading sessions without reading every headline.
- **Native Date Calculation:** `getRelativeTime` avoids heavyweight external libraries like `date-fns` or `moment.js`.
