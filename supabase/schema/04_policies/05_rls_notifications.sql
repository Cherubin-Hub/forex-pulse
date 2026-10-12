-- ============================================================================
-- SCRIPT: 05_rls_notifications.sql
-- TYPE:   Security Policy (RLS)
-- TABLE:  public.notifications
-- ============================================================================

BEGIN;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow insert on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow update on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow delete on notifications" ON public.notifications;

-- Read: Users view their own notifications or system broadcast alerts (user_id IS NULL)
CREATE POLICY "Allow select on notifications" ON public.notifications
    FOR SELECT USING (
        auth.uid() = user_id OR user_id IS NULL
    );

-- Insert: Users or authenticated processes can insert
CREATE POLICY "Allow insert on notifications" ON public.notifications
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR user_id IS NULL
    );

-- Update: Users can update their own notifications (e.g., mark as read)
CREATE POLICY "Allow update on notifications" ON public.notifications
    FOR UPDATE USING (
        auth.uid() = user_id OR user_id IS NULL
    );

-- Delete: Users can delete their own notifications
CREATE POLICY "Allow delete on notifications" ON public.notifications
    FOR DELETE USING (
        auth.uid() = user_id OR user_id IS NULL
    );

COMMIT;
