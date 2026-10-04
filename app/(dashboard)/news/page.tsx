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
