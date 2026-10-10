-- ============================================================================
-- Table: economic_events
-- Purpose: Global economic calendar releases with forecasts, actuals, and impact
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.economic_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  currency TEXT NOT NULL,
  impact TEXT NOT NULL CHECK (impact IN ('HIGH', 'MEDIUM', 'LOW')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  forecast TEXT,
  previous TEXT,
  actual TEXT,
  source TEXT NOT NULL DEFAULT 'Supabase Cloud',
  status TEXT NOT NULL DEFAULT 'LIVE' CHECK (status IN ('LIVE', 'DELAYED', 'MOCK', 'UNAVAILABLE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indices for rapid session filtering and chronological querying
CREATE INDEX IF NOT EXISTS idx_economic_events_scheduled_at ON public.economic_events(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_economic_events_currency ON public.economic_events(currency);
CREATE INDEX IF NOT EXISTS idx_economic_events_impact ON public.economic_events(impact);