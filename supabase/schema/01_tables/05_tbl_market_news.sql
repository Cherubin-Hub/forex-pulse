-- ============================================================================
-- Table: market_news
-- Purpose: Market intelligence articles, impact ratings, and affected currencies
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.market_news (
  id TEXT PRIMARY KEY,
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  source TEXT NOT NULL,
  url TEXT,
  impact TEXT NOT NULL CHECK (impact IN ('HIGH', 'MEDIUM', 'LOW')),
  currencies TEXT[] NOT NULL DEFAULT '{}',
  published_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indices for reverse chronological timeline sorting and currency lookups
CREATE INDEX IF NOT EXISTS idx_market_news_published_at ON public.market_news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_news_currencies ON public.market_news USING GIN (currencies);