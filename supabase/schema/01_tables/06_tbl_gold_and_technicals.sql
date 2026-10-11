-- ============================================================================
-- SCRIPT: 06_tbl_gold_and_technicals.sql
-- TYPE:   Table Definition & Realtime Setup
-- TABLES: public.gold_drivers, public.gold_key_levels, public.technical_analysis
-- ============================================================================

BEGIN;

-- 1. Gold Macro Catalysts & Yield Drivers
CREATE TABLE IF NOT EXISTS public.gold_drivers (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name               TEXT NOT NULL,
    value              TEXT NOT NULL,
    change             NUMERIC(8, 3) NOT NULL DEFAULT 0,
    correlation        TEXT NOT NULL CHECK (correlation IN ('POSITIVE', 'NEGATIVE')),
    impact             TEXT NOT NULL CHECK (impact IN ('BULLISH', 'BEARISH', 'NEUTRAL')),
    created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::TEXT, now())
);

-- 2. Gold Key Structural Pivot Levels
CREATE TABLE IF NOT EXISTS public.gold_key_levels (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    price              NUMERIC(15, 2) NOT NULL,
    type               TEXT NOT NULL CHECK (type IN ('SUPPORT', 'RESISTANCE', 'PIVOT')),
    strength           TEXT NOT NULL CHECK (strength IN ('STRONG', 'MODERATE', 'WEAK')),
    notes              TEXT DEFAULT NULL,
    created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::TEXT, now())
);

-- 3. Multi-Timeframe Technical Indicators Snapshot
CREATE TABLE IF NOT EXISTS public.technical_analysis (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol             TEXT NOT NULL UNIQUE,
    timeframes         JSONB NOT NULL DEFAULT '{}'::JSONB,
    overall_bias       TEXT NOT NULL CHECK (overall_bias IN ('BULLISH', 'BEARISH', 'NEUTRAL')),
    updated_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::TEXT, now())
);

-- Enable RLS (Read-only for public, modifications for service/authenticated)
ALTER TABLE public.gold_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gold_key_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-only access to gold_drivers"
    ON public.gold_drivers FOR SELECT TO public USING (true);

CREATE POLICY "Allow public read-only access to gold_key_levels"
    ON public.gold_key_levels FOR SELECT TO public USING (true);

CREATE POLICY "Allow public read-only access to technical_analysis"
    ON public.technical_analysis FOR SELECT TO public USING (true);

COMMIT;