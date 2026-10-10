-- ============================================================================
-- SCRIPT: 01_fn_handle_updated_at.sql
-- TYPE:   Stored Procedure / Function
-- ROUTINE: public.handle_updated_at()
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::TEXT, now());
    RETURN NEW;
END;
$$;

COMMIT;