-- Apply after supabase/schema. Old mock snapshots are quarantined, not deleted.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gateway_sso_nonces(nonce_hash text PRIMARY KEY,expires_at timestamptz NOT NULL);
ALTER TABLE public.gateway_sso_nonces ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sso_nonces_expiry ON public.gateway_sso_nonces(expires_at);

ALTER TABLE public.user_settings DROP CONSTRAINT IF EXISTS user_settings_news_sensitivity_check;
UPDATE public.user_settings SET news_sensitivity='BALANCED' WHERE news_sensitivity='MODERATE';
ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_news_sensitivity_check CHECK(news_sensitivity IN ('AGGRESSIVE','BALANCED','CONSERVATIVE'));
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS account_balance numeric NOT NULL DEFAULT 10000 CHECK(account_balance>0);
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS leverage integer NOT NULL DEFAULT 100 CHECK(leverage BETWEEN 1 AND 1000);
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS max_daily_loss_r numeric NOT NULL DEFAULT 2 CHECK(max_daily_loss_r>0);
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS automation_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS manual_lockout_until timestamptz;
ALTER TABLE public.user_settings DROP CONSTRAINT IF EXISTS user_settings_risk_limits;
ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_risk_limits CHECK(risk_per_trade_percent BETWEEN 0.1 AND 5 AND min_risk_reward BETWEEN 1 AND 10 AND max_open_setups BETWEEN 1 AND 20 AND max_daily_loss_r BETWEEN 0.1 AND 20 AND account_balance<=1000000000);
ALTER TABLE public.trading_setups ADD COLUMN IF NOT EXISTS original_stop_loss numeric(15,5);
ALTER TABLE public.trading_setups ADD COLUMN IF NOT EXISTS realized_r numeric;
ALTER TABLE public.trading_setups ADD COLUMN IF NOT EXISTS closed_at timestamptz;
ALTER TABLE public.trading_setups ADD COLUMN IF NOT EXISTS risk_percent numeric NOT NULL DEFAULT 1;
UPDATE public.trading_setups SET original_stop_loss=stop_loss WHERE original_stop_loss IS NULL;
UPDATE public.trading_setups SET closed_at=updated_at WHERE closed_at IS NULL AND status IN ('TP_REACHED','SL_HIT','INVALIDATED','EXPIRED');
-- Original stops for legacy breakeven rows are unknowable; flat exits stay flat.
UPDATE public.trading_setups SET realized_r=CASE WHEN status='TP_REACHED' THEN risk_reward WHEN status='SL_HIT' AND stop_loss=(entry_min+entry_max)/2 THEN 0 WHEN status='SL_HIT' THEN -1 ELSE 0 END WHERE realized_r IS NULL AND status IN ('TP_REACHED','SL_HIT','INVALIDATED','EXPIRED');
ALTER TABLE public.session_reports ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.session_reports ADD COLUMN IF NOT EXISTS session_window timestamptz;
UPDATE public.session_reports r SET owner_id=u.id FROM auth.users u WHERE r.owner_id IS NULL AND r.playbook->>'userId'=u.id::text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_owner_window ON public.session_reports(owner_id,session,session_window) WHERE session_window IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.feed_health(feed text PRIMARY KEY,synced_at timestamptz NOT NULL,coverage_from timestamptz,coverage_until timestamptz);
ALTER TABLE public.feed_health ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.feed_health,public.gateway_sso_nonces FROM anon,authenticated;
GRANT ALL ON public.feed_health,public.gateway_sso_nonces TO service_role;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['economic_events','market_news','gold_drivers','gold_key_levels','technical_analysis'] LOOP
 EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS data_source text NOT NULL DEFAULT ''unverified''',t);
 EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS verified_at timestamptz',t);
 END LOOP;
END $$;
REVOKE INSERT,UPDATE,DELETE ON public.trading_setups,public.user_settings,public.session_reports,public.notifications FROM anon,authenticated;
DROP POLICY IF EXISTS "Public read session_reports" ON public.session_reports;
DROP POLICY IF EXISTS "Authenticated insert session_reports" ON public.session_reports;
DROP POLICY IF EXISTS "Authenticated delete session_reports" ON public.session_reports;
DROP POLICY IF EXISTS "Owner read session_reports" ON public.session_reports;
CREATE POLICY "Owner read session_reports" ON public.session_reports FOR SELECT TO authenticated USING(auth.uid()=owner_id);
DROP POLICY IF EXISTS "Allow insert on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow update on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow delete on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow select on notifications" ON public.notifications;
CREATE POLICY "Allow select on notifications" ON public.notifications FOR SELECT TO authenticated USING(auth.uid()=user_id);
CREATE OR REPLACE FUNCTION public.protect_settings_lockout() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF OLD.manual_lockout_until>now() AND (NEW.manual_lockout_until IS NULL OR NEW.manual_lockout_until<OLD.manual_lockout_until) THEN RAISE EXCEPTION 'An active self-exclusion cannot be shortened'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_protect_settings_lockout ON public.user_settings;
CREATE TRIGGER trg_protect_settings_lockout BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.protect_settings_lockout();
CREATE OR REPLACE FUNCTION public.enforce_setup_integrity() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE cfg public.user_settings; daily_r numeric; other_count integer; entry_price numeric; risk_distance numeric;
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.status<>'WAITING_FOR_CONFIRMATION' THEN RAISE EXCEPTION 'Active and closed journal records are immutable'; END IF;
  RETURN OLD;
 END IF;
 IF NEW.user_id IS NULL THEN RAISE EXCEPTION 'A setup requires an account owner'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text,0));
 SELECT * INTO cfg FROM public.user_settings WHERE user_id=NEW.user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Account settings are required'; END IF;
 IF NEW.symbol NOT IN ('EURUSD','GBPUSD','USDJPY','AUDUSD','NZDUSD','USDCAD','USDCHF','XAUUSD') OR NEW.entry_min<=0 OR NEW.entry_max<NEW.entry_min OR NEW.stop_loss<=0 OR NEW.take_profit_1<=0 THEN RAISE EXCEPTION 'Invalid setup price geometry'; END IF;
 IF TG_OP='UPDATE' THEN
  IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN RAISE EXCEPTION 'Setup owner is immutable'; END IF;
  IF OLD.status IN ('TP_REACHED','SL_HIT','INVALIDATED','EXPIRED') THEN RAISE EXCEPTION 'Closed journal records are immutable'; END IF;
  IF NEW.original_stop_loss IS DISTINCT FROM OLD.original_stop_loss OR NEW.risk_percent IS DISTINCT FROM OLD.risk_percent THEN RAISE EXCEPTION 'Original risk is immutable'; END IF;
  IF OLD.status='ENTRY_TRIGGERED' AND (NEW.entry_min,NEW.entry_max,NEW.symbol,NEW.direction,NEW.take_profit_1) IS DISTINCT FROM (OLD.entry_min,OLD.entry_max,OLD.symbol,OLD.direction,OLD.take_profit_1) THEN RAISE EXCEPTION 'Active trade geometry is immutable'; END IF;
  IF OLD.status='ENTRY_TRIGGERED' AND ((NEW.direction='LONG' AND NEW.stop_loss<OLD.stop_loss) OR (NEW.direction='SHORT' AND NEW.stop_loss>OLD.stop_loss)) THEN RAISE EXCEPTION 'Active stops cannot be widened'; END IF;
  IF NEW.status<>OLD.status AND NOT ((OLD.status='WAITING_FOR_CONFIRMATION' AND NEW.status IN ('ENTRY_TRIGGERED','INVALIDATED','EXPIRED')) OR (OLD.status='ENTRY_TRIGGERED' AND NEW.status IN ('TP_REACHED','SL_HIT'))) THEN RAISE EXCEPTION 'Invalid setup transition'; END IF;
 END IF;
 entry_price:=(NEW.entry_min+NEW.entry_max)/2;
 IF TG_OP='INSERT' OR NEW.status='WAITING_FOR_CONFIRMATION' THEN
  IF (NEW.direction='LONG' AND (NEW.stop_loss>=NEW.entry_min OR NEW.take_profit_1<=NEW.entry_max)) OR (NEW.direction='SHORT' AND (NEW.stop_loss<=NEW.entry_max OR NEW.take_profit_1>=NEW.entry_min)) THEN RAISE EXCEPTION 'Invalid stop or target'; END IF;
  IF TG_OP='INSERT' AND NEW.status<>'WAITING_FOR_CONFIRMATION' THEN RAISE EXCEPTION 'New setups must wait for confirmation'; END IF;
  NEW.original_stop_loss:=NEW.stop_loss;
  NEW.risk_reward:=abs(NEW.take_profit_1-entry_price)/abs(entry_price-NEW.stop_loss);
  IF NEW.risk_reward<cfg.min_risk_reward THEN RAISE EXCEPTION 'Minimum risk reward not met'; END IF;
 END IF;
 IF TG_OP='INSERT' THEN NEW.risk_percent:=cfg.risk_per_trade_percent; END IF;
 IF TG_OP='INSERT' OR (TG_OP='UPDATE' AND (NEW.status='WAITING_FOR_CONFIRMATION' OR (NEW.status='ENTRY_TRIGGERED' AND OLD.status<>NEW.status))) THEN
  IF NEW.risk_reward<cfg.min_risk_reward THEN RAISE EXCEPTION 'Minimum risk reward not met'; END IF;
  IF cfg.manual_lockout_until>now() THEN RAISE EXCEPTION 'Trading is locked by self-exclusion'; END IF;
  SELECT coalesce(sum(realized_r),0) INTO daily_r FROM public.trading_setups WHERE user_id=NEW.user_id AND (closed_at AT TIME ZONE 'Asia/Manila')::date=(now() AT TIME ZONE 'Asia/Manila')::date;
  IF daily_r<=-cfg.max_daily_loss_r THEN RAISE EXCEPTION 'Daily loss limit reached'; END IF;
  SELECT count(*) INTO other_count FROM public.trading_setups WHERE user_id=NEW.user_id AND id<>NEW.id AND status IN ('WAITING_FOR_CONFIRMATION','ENTRY_TRIGGERED');
  IF other_count>=cfg.max_open_setups THEN RAISE EXCEPTION 'Maximum open setups reached'; END IF;
  IF daily_r-other_count-1 < -cfg.max_daily_loss_r THEN RAISE EXCEPTION 'Open risk would exceed remaining daily budget'; END IF;
  IF EXISTS(SELECT 1 FROM public.trading_setups WHERE user_id=NEW.user_id AND id<>NEW.id AND symbol=NEW.symbol AND status IN ('WAITING_FOR_CONFIRMATION','ENTRY_TRIGGERED')) THEN RAISE EXCEPTION 'An active setup already exists for this symbol'; END IF;
 END IF;
 IF TG_OP='UPDATE' AND NEW.status IN ('TP_REACHED','SL_HIT','INVALIDATED','EXPIRED') AND NEW.status<>OLD.status THEN
  NEW.closed_at:=now(); risk_distance:=abs(entry_price-NEW.original_stop_loss);
  NEW.realized_r:=CASE WHEN NEW.status='TP_REACHED' THEN abs(NEW.take_profit_1-entry_price)/nullif(risk_distance,0) WHEN NEW.status='SL_HIT' THEN (CASE WHEN NEW.direction='LONG' THEN NEW.stop_loss-entry_price ELSE entry_price-NEW.stop_loss END)/nullif(risk_distance,0) ELSE 0 END;
  NEW.realized_r:=coalesce(NEW.realized_r,0);
 ELSE NEW.closed_at:=NULL; NEW.realized_r:=NULL;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_enforce_setup_integrity ON public.trading_setups;
CREATE TRIGGER trg_enforce_setup_integrity BEFORE INSERT OR UPDATE OR DELETE ON public.trading_setups FOR EACH ROW EXECUTE FUNCTION public.enforce_setup_integrity();
CREATE INDEX IF NOT EXISTS idx_setup_owner_closed ON public.trading_setups(user_id,closed_at);
CREATE OR REPLACE FUNCTION public.ingest_macro_data(payload jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE feed_name text:=payload->>'feed'; observed timestamptz:=(payload->>'observedAt')::timestamptz; source_url text:=payload->>'source';
BEGIN
 IF feed_name NOT IN ('calendar','news','gold_drivers','gold_key_levels') OR observed<now()-interval '1 hour' OR observed>now()+interval '5 seconds' THEN RAISE EXCEPTION 'Invalid feed metadata'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('feed:'||feed_name,0));
 IF EXISTS(SELECT 1 FROM public.feed_health WHERE feed=feed_name AND synced_at>observed) THEN RAISE EXCEPTION 'Out of order feed import'; END IF;
 IF feed_name='calendar' THEN
  DELETE FROM public.economic_events WHERE data_source='verified' AND scheduled_at BETWEEN (payload->>'coverageFrom')::timestamptz AND (payload->>'coverageUntil')::timestamptz;
  INSERT INTO public.economic_events(id,title,currency,impact,scheduled_at,forecast,previous,actual,source,status,data_source,verified_at)
   SELECT id,title,currency,impact,scheduled_at,forecast,previous,actual,source_url,'LIVE','verified',observed FROM jsonb_to_recordset(payload->'records') AS x(id text,title text,currency text,impact text,scheduled_at timestamptz,forecast text,previous text,actual text)
   ON CONFLICT(id) DO UPDATE SET title=excluded.title,currency=excluded.currency,impact=excluded.impact,scheduled_at=excluded.scheduled_at,forecast=excluded.forecast,previous=excluded.previous,actual=excluded.actual,source=excluded.source,status='LIVE',data_source='verified',verified_at=observed;
 ELSIF feed_name='news' THEN
  INSERT INTO public.market_news(id,headline,summary,url,impact,currencies,published_at,source,data_source,verified_at)
   SELECT id,headline,summary,url,impact,currencies,published_at,source_url,'verified',observed FROM jsonb_to_recordset(payload->'records') AS x(id text,headline text,summary text,url text,impact text,currencies text[],published_at timestamptz)
   ON CONFLICT(id) DO UPDATE SET headline=excluded.headline,summary=excluded.summary,url=excluded.url,impact=excluded.impact,currencies=excluded.currencies,published_at=excluded.published_at,source=excluded.source,data_source='verified',verified_at=observed;
 ELSIF feed_name='gold_drivers' THEN
  DELETE FROM public.gold_drivers WHERE data_source='verified';
  INSERT INTO public.gold_drivers(id,name,value,change,correlation,impact,data_source,verified_at)
   SELECT id,name,value,change,correlation,impact,'verified',observed FROM jsonb_to_recordset(payload->'records') AS x(id uuid,name text,value text,change numeric,correlation text,impact text);
 ELSE
  DELETE FROM public.gold_key_levels WHERE data_source='verified';
  INSERT INTO public.gold_key_levels(id,price,type,strength,notes,data_source,verified_at)
   SELECT id,price,type,strength,notes,'verified',observed FROM jsonb_to_recordset(payload->'records') AS x(id uuid,price numeric,type text,strength text,notes text);
 END IF;
 INSERT INTO public.feed_health(feed,synced_at,coverage_from,coverage_until) VALUES(feed_name,observed,(payload->>'coverageFrom')::timestamptz,(payload->>'coverageUntil')::timestamptz) ON CONFLICT(feed) DO UPDATE SET synced_at=excluded.synced_at,coverage_from=excluded.coverage_from,coverage_until=excluded.coverage_until;
END $$;
REVOKE ALL ON FUNCTION public.ingest_macro_data(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_macro_data(jsonb) TO service_role;
COMMIT;
