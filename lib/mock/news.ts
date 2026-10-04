import type { NewsArticle } from "@/types/news";

// Helper to generate a timestamp X hours ago
const hoursAgo = (hours: number) => {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d.toISOString();
};

export const MOCK_NEWS: NewsArticle[] = [
  {
    id: "news-1",
    headline: "Fed Chair Powell Signals Two More Rate Cuts This Year",
    summary: "During the press conference, Jerome Powell hinted that inflation is nearing the 2% target, paving the way for further easing.",
    source: "Federal Reserve",
    impact: "HIGH",
    currencies: ["USD", "XAU"],
    publishedAt: hoursAgo(1),
  },
  {
    id: "news-2",
    headline: "ECB Members Divided on Next Month's Policy Decision",
    summary: "Hawkish members of the European Central Bank push back against market expectations of consecutive rate cuts.",
    source: "Reuters",
    impact: "MEDIUM",
    currencies: ["EUR"],
    publishedAt: hoursAgo(3),
  },
  {
    id: "news-3",
    headline: "UK Retail Sales Fall Unexpectedly in Latest Quarter",
    summary: "Consumer spending slowed down significantly due to rising energy costs and sticky service inflation.",
    source: "Bloomberg",
    impact: "MEDIUM",
    currencies: ["GBP"],
    publishedAt: hoursAgo(5),
  },
  {
    id: "news-4",
    headline: "Japan's Top Currency Diplomat Warns Against Speculative Moves",
    summary: "Kanda stated the government is ready to take appropriate action in the FX market if rapid yen depreciation continues.",
    source: "Kyodo News",
    impact: "HIGH",
    currencies: ["JPY", "USD"],
    publishedAt: hoursAgo(8),
  },
  {
    id: "news-5",
    headline: "Australian Trade Surplus Narrows Slightly",
    summary: "Iron ore exports dipped while imports of machinery increased, narrowing the overall trade balance.",
    source: "Financial Times",
    impact: "LOW",
    currencies: ["AUD"],
    publishedAt: hoursAgo(12),
  },
];
