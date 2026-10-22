-- ============================================================================
-- SCRIPT: 05_idx_trade_post_mortems.sql
-- TYPE:   B-Tree Index
-- TABLE:  public.trade_post_mortems
-- ============================================================================

BEGIN;

CREATE INDEX IF NOT EXISTS idx_trade_post_mortems_user_id 
    ON public.trade_post_mortems(user_id);

CREATE INDEX IF NOT EXISTS idx_trade_post_mortems_setup_id 
    ON public.trade_post_mortems(setup_id);

CREATE INDEX IF NOT EXISTS idx_trade_post_mortems_grade 
    ON public.trade_post_mortems(grade);

CREATE INDEX IF NOT EXISTS idx_trade_post_mortems_reviewed_at 
    ON public.trade_post_mortems(reviewed_at DESC);

COMMIT;
