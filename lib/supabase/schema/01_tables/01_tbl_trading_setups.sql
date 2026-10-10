-- ============================================================================
-- SCRIPT: 01_tbl_trading_setups.sql
-- TYPE:   Table Definition & Configuration
-- TABLE:  public.trading_setups
-- ============================================================================

BEGIN;

-- 1. Table Schema Definition
CREATE TABLE IF NOT EXISTS public.trading_setups (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id            UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol             TEXT NOT NULL,
    direction          TEXT NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
    entry_min          NUMERIC(15, 5) NOT NULL,
    entry_max          NUMERIC(15, 5) NOT NULL,
    stop_loss          NUMERIC(15, 5) NOT NULL,
    take_profit_1      NUMERIC(15, 5) NOT NULL,
    take_profit_2      NUMERIC(15, 5) DEFAULT NULL,
    risk_reward        NUMERIC(6, 2) NOT NULL,
    status             TEXT NOT NULL CHECK (status IN (
                           'WAITING_FOR_CONFIRMATION',
                           'ENTRY_TRIGGERED',
                           'TP_REACHED',
                           'SL_HIT',
                           'INVALIDATED',
                           'EXPIRED'
                       )),
    invalidation_rule  TEXT NOT NULL,
    notes              TEXT DEFAULT NULL,
    confluence_tags    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::TEXT, now()),
    updated_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::TEXT, now())
);

-- 2. Enable Row-Level Security immediately on table creation
ALTER TABLE public.trading_setups ENABLE ROW LEVEL SECURITY;

-- 3. Attach Table to Supabase Realtime Publication (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'trading_setups'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_setups;
    END IF;
END $$;

COMMIT;