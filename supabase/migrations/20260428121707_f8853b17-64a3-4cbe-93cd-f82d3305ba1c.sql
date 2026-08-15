-- 1. Extend sessions with spot tracking
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS spot_id text,
  ADD COLUMN IF NOT EXISTS is_discovered boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_sessions_spot_id ON public.sessions(spot_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON public.sessions(started_at DESC);

-- 2. Discovered (crowd-learned) spots
CREATE TABLE IF NOT EXISTS public.discovered_spots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  spot_id text NOT NULL UNIQUE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  address text,
  visit_count integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discovered_spots_latlng ON public.discovered_spots(lat, lng);
CREATE INDEX IF NOT EXISTS idx_discovered_spots_visit_count ON public.discovered_spots(visit_count DESC);

ALTER TABLE public.discovered_spots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Discovered spots: public read" ON public.discovered_spots;
CREATE POLICY "Discovered spots: public read"
  ON public.discovered_spots FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Discovered spots: insert by authenticated" ON public.discovered_spots;
CREATE POLICY "Discovered spots: insert by authenticated"
  ON public.discovered_spots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

DROP POLICY IF EXISTS "Discovered spots: update by authenticated" ON public.discovered_spots;
CREATE POLICY "Discovered spots: update by authenticated"
  ON public.discovered_spots FOR UPDATE
  TO authenticated
  USING (true);

CREATE TRIGGER trg_discovered_spots_updated_at
  BEFORE UPDATE ON public.discovered_spots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Trigger: when a session starts → log "busy" report + upsert discovered spot
CREATE OR REPLACE FUNCTION public.on_session_insert_track_spot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_spot_id text;
BEGIN
  -- Determine spot identifier: explicit spot_id, else lat/lng-derived bucket (~5m precision)
  IF NEW.spot_id IS NOT NULL AND length(NEW.spot_id) > 0 THEN
    v_spot_id := NEW.spot_id;
  ELSIF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    v_spot_id := 'geo:' || round(NEW.lat::numeric, 5)::text || ',' || round(NEW.lng::numeric, 5)::text;
    NEW.spot_id := v_spot_id;
  ELSE
    RETURN NEW;
  END IF;

  -- Log a "busy" crowd report (anonymous-safe: bound to user)
  INSERT INTO public.spot_reports (spot_id, status, user_id, lat, lng, note)
  VALUES (v_spot_id, 'busy', NEW.user_id, NEW.lat, NEW.lng, 'auto: session started');

  -- Upsert discovered spot if location is known
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    INSERT INTO public.discovered_spots (spot_id, lat, lng, address, created_by, visit_count, last_seen_at)
    VALUES (v_spot_id, NEW.lat, NEW.lng, NEW.address, NEW.user_id, 1, now())
    ON CONFLICT (spot_id) DO UPDATE
      SET visit_count = public.discovered_spots.visit_count + 1,
          last_seen_at = now(),
          address = COALESCE(public.discovered_spots.address, EXCLUDED.address);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_session_insert_track_spot ON public.sessions;
CREATE TRIGGER trg_session_insert_track_spot
  BEFORE INSERT ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.on_session_insert_track_spot();

-- 4. Trigger: when session ends → log "free" report
CREATE OR REPLACE FUNCTION public.on_session_end_release_spot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL
     AND (OLD.ended_at IS NULL)
     AND NEW.spot_id IS NOT NULL THEN
    INSERT INTO public.spot_reports (spot_id, status, user_id, lat, lng, note)
    VALUES (NEW.spot_id, 'free', NEW.user_id, NEW.lat, NEW.lng, 'auto: session ended');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_session_end_release_spot ON public.sessions;
CREATE TRIGGER trg_session_end_release_spot
  AFTER UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.on_session_end_release_spot();

-- 5. Public anonymized analytics view (no user_id exposure)
CREATE OR REPLACE VIEW public.spot_activity_stats
WITH (security_invoker=on) AS
SELECT
  spot_id,
  count(*)::int AS total_sessions,
  count(*) FILTER (WHERE ended_at IS NULL)::int AS active_now,
  max(started_at) AS last_started_at,
  avg(EXTRACT(EPOCH FROM (COALESCE(ended_at, ends_at) - started_at)))::int AS avg_duration_sec
FROM public.sessions
WHERE spot_id IS NOT NULL
GROUP BY spot_id;

-- Allow public read on the view
GRANT SELECT ON public.spot_activity_stats TO anon, authenticated;