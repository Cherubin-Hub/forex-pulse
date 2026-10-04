import type { NewsArticle } from "@/types/news";
import { MOCK_NEWS } from "@/lib/mock/news";

export async function getNews(): Promise<NewsArticle[]> {
  // We sort the news so the newest articles are always at the top of the array
  return MOCK_NEWS.sort((a, b) => 
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}
