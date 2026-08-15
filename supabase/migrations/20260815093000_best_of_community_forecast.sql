-- Best-of v2: privacy-safe community signals, release forecasts and robust Premium trial.

ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS spot_id text;
CREATE INDEX IF NOT EXISTS sessions_spot_ends_idx ON public.sessions (spot_id, ends_at DESC);

CREATE TABLE IF NOT EXISTS public.spot_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('free','busy','full')),
  note text,
  lat double precision,
  lng double precision,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS spot_reports_spot_recent_idx ON public.spot_reports (spot_id, created_at DESC);
ALTER TABLE public.spot_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Spot reports: public read" ON public.spot_reports;
DROP POLICY IF EXISTS "Spot reports: select own" ON public.spot_reports;
DROP POLICY IF EXISTS "Spot reports: insert own" ON public.spot_reports;
DROP POLICY IF EXISTS "Spot reports: update own" ON public.spot_reports;
DROP POLICY IF EXISTS "Spot reports: delete own" ON public.spot_reports;
CREATE POLICY "Spot reports: select own" ON public.spot_reports
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "Spot reports: insert own" ON public.spot_reports
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Spot reports: update own" ON public.spot_reports
  FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Spot reports: delete own" ON public.spot_reports
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- Harden ownership checks on existing personal tables too.
DROP POLICY IF EXISTS "Profiles: update own" ON public.profiles;
CREATE POLICY "Profiles: update own" ON public.profiles
  FOR UPDATE TO authenticated USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);
DROP POLICY IF EXISTS "Sessions: update own" ON public.sessions;
CREATE POLICY "Sessions: update own" ON public.sessions
  FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- Public-safe recent reports. No user id, note or coordinates leave the database.
CREATE OR REPLACE FUNCTION public.get_spot_reports_public(_spot_id text, _minutes integer DEFAULT 90)
RETURNS TABLE(id uuid, spot_id text, status text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.id, r.spot_id, r.status, r.created_at
  FROM public.spot_reports r
  WHERE r.spot_id = _spot_id
    AND r.created_at >= now() - make_interval(mins => LEAST(GREATEST(_minutes, 1), 180))
  ORDER BY r.created_at DESC
  LIMIT 30;
$$;
REVOKE ALL ON FUNCTION public.get_spot_reports_public(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_spot_reports_public(text, integer) TO anon, authenticated;

-- Aggregate forecast from active app timers. No exact user/session timestamps are returned.
CREATE OR REPLACE FUNCTION public.get_spot_forecast_public()
RETURNS TABLE(
  spot_id text,
  active_sessions integer,
  departing_5m integer,
  departing_10m integer,
  overdue_sessions integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    s.spot_id,
    count(*) FILTER (WHERE s.ended_at IS NULL AND s.ends_at > now())::integer,
    count(*) FILTER (WHERE s.ended_at IS NULL AND s.ends_at > now() AND s.ends_at <= now() + interval '5 minutes')::integer,
    count(*) FILTER (WHERE s.ended_at IS NULL AND s.ends_at > now() + interval '5 minutes' AND s.ends_at <= now() + interval '10 minutes')::integer,
    count(*) FILTER (WHERE s.ended_at IS NULL AND s.ends_at <= now() AND s.ends_at >= now() - interval '15 minutes')::integer
  FROM public.sessions s
  WHERE s.spot_id IS NOT NULL
    AND s.spot_id LIKE 'parko:%'
    AND s.started_at >= now() - interval '2 hours'
  GROUP BY s.spot_id;
$$;
REVOKE ALL ON FUNCTION public.get_spot_forecast_public() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_spot_forecast_public() TO anon, authenticated;

-- Session triggers run with the caller's RLS context: no privilege escalation is needed.
CREATE OR REPLACE FUNCTION public.on_session_insert_track_spot()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
BEGIN
  IF NEW.spot_id IS NOT NULL AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.spot_reports(spot_id, status, user_id, note)
    VALUES (NEW.spot_id, 'busy', NEW.user_id, 'auto:session-start');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_session_end_release_spot()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
BEGIN
  IF OLD.ended_at IS NULL AND NEW.ended_at IS NOT NULL AND NEW.spot_id IS NOT NULL AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.spot_reports(spot_id, status, user_id, note)
    VALUES (NEW.spot_id, 'free', NEW.user_id, 'auto:session-end');
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.on_session_insert_track_spot() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_session_end_release_spot() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_session_insert_track_spot ON public.sessions;
CREATE TRIGGER trg_session_insert_track_spot
  AFTER INSERT ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.on_session_insert_track_spot();
DROP TRIGGER IF EXISTS trg_session_end_release_spot ON public.sessions;
CREATE TRIGGER trg_session_end_release_spot
  AFTER UPDATE OF ended_at ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.on_session_end_release_spot();

-- Server-side 7-day Premium trial. The guard trigger blocks direct client edits,
-- while the RPC opens a narrow transaction-local flag for the legitimate update only.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

CREATE OR REPLACE FUNCTION public.protect_trial_ends_at()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
BEGIN
  IF current_setting('shopgo.allow_trial_write', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at THEN
    RAISE EXCEPTION 'trial_ends_at cannot be modified directly';
  END IF;
  IF TG_OP = 'INSERT' AND NEW.trial_ends_at IS NOT NULL THEN
    NEW.trial_ends_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_trial_ends_at_trigger ON public.profiles;
CREATE TRIGGER protect_trial_ends_at_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_trial_ends_at();

CREATE OR REPLACE FUNCTION public.start_trial()
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  existing timestamptz;
  new_end timestamptz;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT trial_ends_at INTO existing FROM public.profiles WHERE id = uid FOR UPDATE;
  IF existing IS NOT NULL THEN RAISE EXCEPTION 'Trial already used'; END IF;
  new_end := now() + interval '7 days';
  PERFORM set_config('shopgo.allow_trial_write', 'on', true);
  UPDATE public.profiles SET trial_ends_at = new_end WHERE id = uid;
  RETURN new_end;
END;
$$;
REVOKE ALL ON FUNCTION public.start_trial() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_trial() TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_trial()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  PERFORM set_config('shopgo.allow_trial_write', 'on', true);
  UPDATE public.profiles
    SET trial_ends_at = CASE WHEN trial_ends_at IS NULL THEN NULL ELSE LEAST(trial_ends_at, now()) END
    WHERE id = uid;
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_trial() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_trial() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_premium(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = _user_id
        AND (s.status IN ('active','trialing','past_due') OR (s.status = 'canceled' AND s.current_period_end > now()))
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = _user_id AND p.trial_ends_at IS NOT NULL AND p.trial_ends_at > now()
    );
$$;
REVOKE ALL ON FUNCTION public.is_premium(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_premium(uuid) TO authenticated, service_role;
