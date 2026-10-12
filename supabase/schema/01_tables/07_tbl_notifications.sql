-- ============================================================================
-- SCRIPT: 07_tbl_notifications.sql
-- TYPE:   Table Definition & Configuration
-- TABLE:  public.notifications
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.notifications (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type          TEXT NOT NULL CHECK (type IN (
                      'NEWS_RISK',
                      'SETUP_STATUS',
                      'SESSION_ALERT',
                      'RISK_WARNING',
                      'PRICE_SIGNAL'
                  )),
    priority      TEXT NOT NULL CHECK (priority IN ('CRITICAL', 'HIGH', 'INFO')),
    title         TEXT NOT NULL,
    message       TEXT NOT NULL,
    symbol        TEXT DEFAULT NULL,
    link_href     TEXT DEFAULT NULL,
    action_label  TEXT DEFAULT NULL,
    read          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::TEXT, now())
);

-- Enable Row-Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Attach Table to Supabase Realtime Publication (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END $$;

COMMIT;
