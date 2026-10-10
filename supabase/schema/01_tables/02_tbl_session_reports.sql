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