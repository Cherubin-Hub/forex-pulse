-- ============================================================================
-- SCRIPT: 06_rls_trade_post_mortems.sql
-- TYPE:   Security Policy (RLS)
-- TABLE:  public.trade_post_mortems
-- ============================================================================

BEGIN;

ALTER TABLE public.trade_post_mortems ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select on trade_post_mortems" ON public.trade_post_mortems;
DROP POLICY IF EXISTS "Allow insert on trade_post_mortems" ON public.trade_post_mortems;
DROP POLICY IF EXISTS "Allow update on trade_post_mortems" ON public.trade_post_mortems;
DROP POLICY IF EXISTS "Allow delete on trade_post_mortems" ON public.trade_post_mortems;

-- Read: Users view their own post-mortem records
CREATE POLICY "Allow select on trade_post_mortems" ON public.trade_post_mortems
    FOR SELECT USING (
        auth.uid() = user_id
    );

-- Insert: Users can only insert their own records
CREATE POLICY "Allow insert on trade_post_mortems" ON public.trade_post_mortems
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

-- Update: Users can only update their own records
CREATE POLICY "Allow update on trade_post_mortems" ON public.trade_post_mortems
    FOR UPDATE USING (
        auth.uid() = user_id
    );

-- Delete: Users can only delete their own records
CREATE POLICY "Allow delete on trade_post_mortems" ON public.trade_post_mortems
    FOR DELETE USING (
        auth.uid() = user_id
    );

COMMIT;
