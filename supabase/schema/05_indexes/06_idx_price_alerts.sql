-- ============================================================================
-- SCRIPT: 06_idx_price_alerts.sql
-- TYPE:   B-Tree Index
-- TABLE:  public.price_alerts
-- ============================================================================

BEGIN;

CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id 
    ON public.price_alerts(user_id);

CREATE INDEX IF NOT EXISTS idx_price_alerts_status 
    ON public.price_alerts(status);

CREATE INDEX IF NOT EXISTS idx_price_alerts_symbol 
    ON public.price_alerts(symbol);

CREATE INDEX IF NOT EXISTS idx_price_alerts_setup_id 
    ON public.price_alerts(setup_id);

COMMIT;
