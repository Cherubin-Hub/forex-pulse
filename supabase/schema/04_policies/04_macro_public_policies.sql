-- ============================================================================
-- Row Level Security (RLS) Policies for Public Macro Intelligence
-- ============================================================================

ALTER TABLE public.economic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_news ENABLE ROW LEVEL SECURITY;

-- Allow read access to all clients for economic releases
DROP POLICY IF EXISTS "Public can view economic events" ON public.economic_events;
CREATE POLICY "Public can view economic events"
  ON public.economic_events
  FOR SELECT
  USING (true);

-- Allow read access to all clients for market news
DROP POLICY IF EXISTS "Public can view market news" ON public.market_news;
CREATE POLICY "Public can view market news"
  ON public.market_news
  FOR SELECT
  USING (true);