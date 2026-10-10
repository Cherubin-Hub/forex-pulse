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