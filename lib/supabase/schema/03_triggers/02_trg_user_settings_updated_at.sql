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