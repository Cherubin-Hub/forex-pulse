-- ============================================================================
-- SCRIPT: 09_tbl_price_alerts.sql
-- TYPE:   Table Definition & Configuration
-- TABLE:  public.price_alerts
-- ============================================================================

BEGIN;

-- 1. Table Schema Definition
CREATE TABLE IF NOT EXISTS public.price_alerts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    setup_id        UUID REFERENCES public.trading_setups(id) ON DELETE SET NULL,
    symbol          TEXT NOT NULL,
    condition       TEXT NOT NULL CHECK (condition IN (
                        'PRICE_ABOVE',
                        'PRICE_BELOW',
                        'PRICE_INSIDE_ZONE',
                        'PROXIMITY_PIPS',
                        'BREAKEVEN_REACHED'
                    )),
    target_price    NUMERIC(15, 5) NOT NULL,
    proximity_pips  NUMERIC(8, 2) DEFAULT NULL,
    action          TEXT NOT NULL CHECK (action IN (
                        'NOTIFY',
                        'AUTO_TRIGGER',
                        'AUTO_BREAKEVEN'
                    )),
    status          TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN (
                        'ACTIVE',
                        'FIRED',
                        'DISMISSED'
                    )),
    message         TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::TEXT, now()),
    fired_at        TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 2. Enable Row-Level Security immediately
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- 3. Attach Table to Supabase Realtime Publication (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'price_alerts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.price_alerts;
    END IF;
END $$;

COMMIT;
