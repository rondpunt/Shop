-- Best-of v2: privacy-safe community signals + departing-soon forecast.
-- Raw rows remain protected by RLS. Public clients only receive aggregate/non-identifying RPC output.

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS spot_id text;
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
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Spot reports: insert own" ON public.spot_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Spot reports: update own" ON public.spot_reports
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Spot reports: delete own" ON public.spot_reports
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Public-safe recent reports. No user_id, note or coordinates leave the database.
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

-- Aggregate forecast derived from active app timers. It deliberately exposes no exact user/session timestamps.
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
    count(*) FILTER (WHERE s.ended_at IS NULL AND s.ends_at > now())::integer AS active_sessions,
    count(*) FILTER (WHERE s.ended_at IS NULL AND s.ends_at > now() AND s.ends_at <= now() + interval '5 minutes')::integer AS departing_5m,
    count(*) FILTER (WHERE s.ended_at IS NULL AND s.ends_at > now() + interval '5 minutes' AND s.ends_at <= now() + interval '10 minutes')::integer AS departing_10m,
    count(*) FILTER (WHERE s.ended_at IS NULL AND s.ends_at <= now() AND s.ends_at >= now() - interval '15 minutes')::integer AS overdue_sessions
  FROM public.sessions s
  WHERE s.spot_id IS NOT NULL
    AND s.spot_id LIKE 'parko:%'
    AND s.started_at >= now() - interval '2 hours'
  GROUP BY s.spot_id;
$$;
REVOKE ALL ON FUNCTION public.get_spot_forecast_public() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_spot_forecast_public() TO anon, authenticated;

-- Automatic crowd signal when a signed-in user starts/ends a timer.
CREATE OR REPLACE FUNCTION public.on_session_insert_track_spot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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
