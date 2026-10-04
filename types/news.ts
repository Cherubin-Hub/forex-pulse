export type NewsImpact = "HIGH" | "MEDIUM" | "LOW";

export type NewsArticle = {
  id: string;
  headline: string;
  summary: string;
  source: string;       // e.g., "Reuters", "Bloomberg", "Central Bank"
  url?: string;         // Optional link to full article
  impact: NewsImpact;
  currencies: string[]; // e.g., ["USD", "EUR"] - which pairs are affected
  publishedAt: string;  // ISO 8601 timestamp
};
