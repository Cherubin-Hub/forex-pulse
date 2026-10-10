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
