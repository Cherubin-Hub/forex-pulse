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