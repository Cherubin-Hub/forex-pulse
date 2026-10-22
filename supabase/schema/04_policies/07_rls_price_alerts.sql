-- ============================================================================
-- SCRIPT: 07_rls_price_alerts.sql
-- TYPE:   Security Policy (RLS)
-- TABLE:  public.price_alerts
-- ============================================================================

BEGIN;

ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select on price_alerts" ON public.price_alerts;
DROP POLICY IF EXISTS "Allow insert on price_alerts" ON public.price_alerts;
DROP POLICY IF EXISTS "Allow update on price_alerts" ON public.price_alerts;
DROP POLICY IF EXISTS "Allow delete on price_alerts" ON public.price_alerts;

-- Read: Users view their own alerts
CREATE POLICY "Allow select on price_alerts" ON public.price_alerts
    FOR SELECT USING (
        auth.uid() = user_id
    );

-- Insert: Users can only create their own alerts
CREATE POLICY "Allow insert on price_alerts" ON public.price_alerts
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

-- Update: Users can only modify their own alerts
CREATE POLICY "Allow update on price_alerts" ON public.price_alerts
    FOR UPDATE USING (
        auth.uid() = user_id
    );

-- Delete: Users can only delete their own alerts
CREATE POLICY "Allow delete on price_alerts" ON public.price_alerts
    FOR DELETE USING (
        auth.uid() = user_id
    );

COMMIT;
