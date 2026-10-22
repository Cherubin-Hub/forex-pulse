-- ============================================================================
-- SCRIPT: 08_tbl_trade_post_mortems.sql
-- TYPE:   Table Definition & Configuration
-- TABLE:  public.trade_post_mortems
-- ============================================================================

BEGIN;

-- 1. Table Schema Definition
CREATE TABLE IF NOT EXISTS public.trade_post_mortems (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setup_id             UUID NOT NULL REFERENCES public.trading_setups(id) ON DELETE CASCADE,
    user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    grade                TEXT NOT NULL CHECK (grade IN ('A', 'B', 'C', 'D', 'F')),
    psychological_state  TEXT NOT NULL CHECK (psychological_state IN (
                             'DISCIPLINED',
                             'CONFIDENT',
                             'NEUTRAL',
                             'ANXIOUS',
                             'FOMO',
                             'HESITANT',
                             'REVENGE'
                         )),
    mistake_category     TEXT NOT NULL CHECK (mistake_category IN (
                             'NONE',
                             'EARLY_ENTRY',
                             'LATE_CHASE',
                             'MOVED_SL',
                             'PREMATURE_EXIT',
                             'OVERSIZED',
                             'NEWS_GAMBLE',
                             'IGNORED_HTF_BIAS'
                         )),
    rules_followed       JSONB NOT NULL DEFAULT '{"planFollowed": true, "riskManaged": true, "stopHonored": true, "targetPatient": true}'::jsonb,
    discipline_score     INTEGER NOT NULL CHECK (discipline_score >= 0 AND discipline_score <= 100),
    retrospective_notes  TEXT NOT NULL DEFAULT '',
    reviewed_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::TEXT, now()),
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::TEXT, now()),
    updated_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::TEXT, now()),
    CONSTRAINT uq_trade_post_mortems_user_setup UNIQUE (user_id, setup_id)
);

-- 2. Enable Row-Level Security immediately
ALTER TABLE public.trade_post_mortems ENABLE ROW LEVEL SECURITY;

-- 3. Attach Table to Supabase Realtime Publication (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'trade_post_mortems'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_post_mortems;
    END IF;
END $$;

COMMIT;
