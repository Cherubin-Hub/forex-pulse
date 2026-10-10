-- ============================================================================
-- SCRIPT: 02_idx_session_reports.sql
-- TYPE:   B-Tree Index
-- TABLE:  public.session_reports
-- ============================================================================

BEGIN;

CREATE INDEX IF NOT EXISTS idx_session_reports_timestamp 
    ON public.session_reports(timestamp DESC);

COMMIT;