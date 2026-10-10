-- ============================================================================
-- SCRIPT: 03_rls_user_settings.sql
-- TYPE:   Security Policy (RLS)
-- TABLE:  public.user_settings
-- ============================================================================

BEGIN;

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;

-- Read: Only the account owner can view their risk profile
CREATE POLICY "Users can view their own settings" ON public.user_settings
    FOR SELECT USING (
        auth.uid() = user_id
    );

-- Insert: Only the account owner can create their settings row
CREATE POLICY "Users can insert their own settings" ON public.user_settings
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

-- Update: Only the account owner can modify their risk profile
CREATE POLICY "Users can update their own settings" ON public.user_settings
    FOR UPDATE USING (
        auth.uid() = user_id
    );

COMMIT;