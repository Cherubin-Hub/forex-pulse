-- ============================================================================
-- SCRIPT: 04_idx_notifications.sql
-- TYPE:   B-Tree Index
-- TABLE:  public.notifications
-- ============================================================================

BEGIN;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
    ON public.notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_read 
    ON public.notifications(read);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
    ON public.notifications(created_at DESC);

COMMIT;
