-- ============================================================================
-- SCRIPT: 02_fn_handle_new_user.sql
-- TYPE:   Stored Procedure / Function
-- ROUTINE: public.handle_new_user()
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_settings (
        user_id,
        trader_profile,
        risk_per_trade_percent,
        min_risk_reward,
        max_open_setups,
        session_focus,
        news_sensitivity
    ) VALUES (
        NEW.id,
        'DAY_TRADER',
        1.0,
        2.0,
        3,
        ARRAY['LONDON', 'NEW_YORK']::TEXT[],
        'CONSERVATIVE'
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

COMMIT;