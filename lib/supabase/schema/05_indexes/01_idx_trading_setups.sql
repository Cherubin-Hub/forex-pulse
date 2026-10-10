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