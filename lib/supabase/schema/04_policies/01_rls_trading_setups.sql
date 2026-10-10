-- ============================================================================
-- SCRIPT: 01_rls_trading_setups.sql
-- TYPE:   Security Policy (RLS)
-- TABLE:  public.trading_setups
-- ============================================================================

BEGIN;

ALTER TABLE public.trading_setups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select on trading_setups" ON public.trading_setups;
DROP POLICY IF EXISTS "Allow insert on trading_setups" ON public.trading_setups;
DROP POLICY IF EXISTS "Allow update on trading_setups" ON public.trading_setups;
DROP POLICY IF EXISTS "Allow delete on trading_setups" ON public.trading_setups;

-- Read: Users view their own setups or seeded templates (user_id IS NULL)
CREATE POLICY "Allow select on trading_setups" ON public.trading_setups
    FOR SELECT USING (
        auth.uid() = user_id OR user_id IS NULL
    );

-- Insert: Users can only insert records assigned to their own identity
CREATE POLICY "Allow insert on trading_setups" ON public.trading_setups
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

-- Update: Users can only modify their own setups
CREATE POLICY "Allow update on trading_setups" ON public.trading_setups
    FOR UPDATE USING (
        auth.uid() = user_id
    );

-- Delete: Users can only delete their own setups
CREATE POLICY "Allow delete on trading_setups" ON public.trading_setups
    FOR DELETE USING (
        auth.uid() = user_id
    );

COMMIT;