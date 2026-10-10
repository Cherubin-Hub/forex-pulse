-- ============================================================================
-- SCRIPT: 02_rls_session_reports.sql
-- TYPE:   Security Policy (RLS)
-- TABLE:  public.session_reports
-- ============================================================================

BEGIN;

ALTER TABLE public.session_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read session_reports" ON public.session_reports;

-- Public read access for institutional macro briefs
CREATE POLICY "Public read session_reports" ON public.session_reports
    FOR SELECT USING (true);

COMMIT;