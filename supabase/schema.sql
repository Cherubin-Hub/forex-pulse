-- ============================================================================
-- FOREX PULSE - CONSOLIDATED DATABASE SCHEMA & MIGRATIONS
-- Auto-generated via: tools/merge.js
-- Generated at:       2026-10-10T19:16:12.977Z
-- Total Scripts:      15
-- ============================================================================

-- ============================================================================
-- SECTION [1]: supabase/schema/00_extensions/00_extensions.sql
-- ============================================================================

-- ============================================================================
-- SCRIPT: 00_extensions.sql
-- TYPE:   PostgreSQL Extension Setup
-- SCOPE:  Cryptographic & UUID generation capabilities
-- ============================================================================

BEGIN;

-- Enable UUID extension for auto-generating primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for cryptographic hash utilities
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

COMMIT;

-- ============================================================================
-- SECTION [2]: supabase/schema/01_tables/01_tbl_trading_setups.sql
-- ============================================================================

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

-- ============================================================================
-- SECTION [3]: supabase/schema/01_tables/02_tbl_session_reports.sql
-- ============================================================================

-- ============================================================================
-- SCRIPT: 02_tbl_session_reports.sql
-- TYPE:   Table Definition
-- TABLE:  public.session_reports
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.session_reports (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title              TEXT NOT NULL,
    session            TEXT NOT NULL CHECK (session IN ('LONDON_OPEN', 'NEW_YORK_OPEN', 'ASIAN_WRAP')),
    timestamp          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::TEXT, now()),
    bias               TEXT NOT NULL CHECK (bias IN ('BULLISH_USD', 'BEARISH_USD', 'NEUTRAL', 'RISK_OFF', 'RISK_ON')),
    volatility         TEXT NOT NULL CHECK (volatility IN ('LOW', 'NORMAL', 'HIGH', 'EXTREME')),
    executive_summary  TEXT NOT NULL,
    macro_catalysts    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    key_levels         JSONB NOT NULL DEFAULT '[]'::JSONB,
    playbook           JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::TEXT, now())
);

COMMIT;

-- ============================================================================
-- SECTION [4]: supabase/schema/01_tables/03_tbl_user_settings.sql
-- ============================================================================

-- ============================================================================
-- SCRIPT: 03_tbl_user_settings.sql
-- TYPE:   Table Definition
-- TABLE:  public.user_settings
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_settings (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trader_profile         TEXT NOT NULL DEFAULT 'DAY_TRADER' CHECK (trader_profile IN ('SCALPER', 'DAY_TRADER', 'SWING_TRADER')),
    risk_per_trade_percent NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
    min_risk_reward        NUMERIC(5, 2) NOT NULL DEFAULT 2.00,
    max_open_setups        INTEGER NOT NULL DEFAULT 3,
    session_focus          TEXT[] NOT NULL DEFAULT ARRAY['LONDON', 'NEW_YORK']::TEXT[],
    news_sensitivity       TEXT NOT NULL DEFAULT 'CONSERVATIVE' CHECK (news_sensitivity IN ('AGGRESSIVE', 'MODERATE', 'CONSERVATIVE')),
    updated_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::TEXT, now())
);

COMMIT;

-- ============================================================================
-- SECTION [5]: supabase/schema/02_stored_procedures/01_fn_handle_updated_at.sql
-- ============================================================================

-- ============================================================================
-- SCRIPT: 01_fn_handle_updated_at.sql
-- TYPE:   Stored Procedure / Function
-- ROUTINE: public.handle_updated_at()
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::TEXT, now());
    RETURN NEW;
END;
$$;

COMMIT;

-- ============================================================================
-- SECTION [6]: supabase/schema/02_stored_procedures/02_fn_handle_new_user.sql
-- ============================================================================

-- ============================================================================
-- SCRIPT: 02_fn_handle_new_user.sql
-- TYPE:   Stored Procedure / Function
-- ROUTINE: public.handle_new_user()
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_settings (
        user_id,
        trader_profile,
        risk_per_trade_percent,
        min_risk_reward,
        max_open_setups,
        session_focus,
        news_sensitivity
    ) VALUES (
        NEW.id,
        'DAY_TRADER',
        1.0,
        2.0,
        3,
        ARRAY['LONDON', 'NEW_YORK']::TEXT[],
        'CONSERVATIVE'
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

COMMIT;

-- ============================================================================
-- SECTION [7]: supabase/schema/03_triggers/01_trg_trading_setups_updated_at.sql
-- ============================================================================

-- ============================================================================
-- SCRIPT: 01_trg_trading_setups_updated_at.sql
-- TYPE:   Trigger Definition
-- TARGET: public.trading_setups
-- ============================================================================

BEGIN;

DROP TRIGGER IF EXISTS trg_trading_setups_updated_at ON public.trading_setups;

CREATE TRIGGER trg_trading_setups_updated_at
    BEFORE UPDATE ON public.trading_setups
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

COMMIT;

-- ============================================================================
-- SECTION [8]: supabase/schema/03_triggers/02_trg_user_settings_updated_at.sql
-- ============================================================================

-- ============================================================================
-- SCRIPT: 02_trg_user_settings_updated_at.sql
-- TYPE:   Trigger Definition
-- TARGET: public.user_settings
-- ============================================================================

BEGIN;

DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON public.user_settings;

CREATE TRIGGER trg_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

COMMIT;

-- ============================================================================
-- SECTION [9]: supabase/schema/03_triggers/03_trg_on_auth_user_created.sql
-- ============================================================================

-- ============================================================================
-- SCRIPT: 03_trg_on_auth_user_created.sql
-- TYPE:   Trigger Definition
-- TARGET: auth.users
-- ============================================================================

BEGIN;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;

CREATE TRIGGER trg_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

COMMIT;

-- ============================================================================
-- SECTION [10]: supabase/schema/04_policies/01_rls_trading_setups.sql
-- ============================================================================

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

-- ============================================================================
-- SECTION [11]: supabase/schema/04_policies/02_rls_session_reports.sql
-- ============================================================================

-- ============================================================================
-- SCRIPT: 02_rls_session_reports.sql
-- TYPE:   Security Policy (RLS)
-- TABLE:  public.session_reports
-- ============================================================================

BEGIN;

ALTER TABLE public.session_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read session_reports" ON public.session_reports;
DROP POLICY IF EXISTS "Authenticated insert session_reports" ON public.session_reports;
DROP POLICY IF EXISTS "Authenticated delete session_reports" ON public.session_reports;

-- Public read access for institutional macro briefs
CREATE POLICY "Public read session_reports" ON public.session_reports
    FOR SELECT USING (true);

-- Authenticated users can publish new session reports
CREATE POLICY "Authenticated insert session_reports" ON public.session_reports
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can delete session reports
CREATE POLICY "Authenticated delete session_reports" ON public.session_reports
    FOR DELETE USING (auth.role() = 'authenticated');

COMMIT;

-- ============================================================================
-- SECTION [12]: supabase/schema/04_policies/03_rls_user_settings.sql
-- ============================================================================

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

-- ============================================================================
-- SECTION [13]: supabase/schema/05_indexes/01_idx_trading_setups.sql
-- ============================================================================

-- ============================================================================
-- SCRIPT: 01_idx_trading_setups.sql
-- TYPE:   B-Tree Index
-- TABLE:  public.trading_setups
-- ============================================================================

BEGIN;

CREATE INDEX IF NOT EXISTS idx_trading_setups_user_id 
    ON public.trading_setups(user_id);

CREATE INDEX IF NOT EXISTS idx_trading_setups_status 
    ON public.trading_setups(status);

CREATE INDEX IF NOT EXISTS idx_trading_setups_created_at 
    ON public.trading_setups(created_at DESC);

COMMIT;

-- ============================================================================
-- SECTION [14]: supabase/schema/05_indexes/02_idx_session_reports.sql
-- ============================================================================

-- ============================================================================
-- SCRIPT: 02_idx_session_reports.sql
-- TYPE:   B-Tree Index
-- TABLE:  public.session_reports
-- ============================================================================

BEGIN;

CREATE INDEX IF NOT EXISTS idx_session_reports_timestamp 
    ON public.session_reports(timestamp DESC);

COMMIT;

-- ============================================================================
-- SECTION [15]: supabase/schema/05_indexes/03_idx_user_settings.sql
-- ============================================================================

-- ============================================================================
-- SCRIPT: 03_idx_user_settings.sql
-- TYPE:   Unique B-Tree Index
-- TABLE:  public.user_settings
-- ============================================================================

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_user_id 
    ON public.user_settings(user_id);

COMMIT;
