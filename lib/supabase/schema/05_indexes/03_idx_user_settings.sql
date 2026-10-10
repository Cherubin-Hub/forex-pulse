-- ============================================================================
-- SCRIPT: 03_idx_user_settings.sql
-- TYPE:   Unique B-Tree Index
-- TABLE:  public.user_settings
-- ============================================================================

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_user_id 
    ON public.user_settings(user_id);

COMMIT;