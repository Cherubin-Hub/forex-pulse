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