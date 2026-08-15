-- Security hardening for legacy crowd-discovered parking data.
-- Public clients should never be able to enumerate creator user IDs or mutate
-- another user's discovered parking record directly.

ALTER TABLE public.discovered_spots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Discovered spots: public read" ON public.discovered_spots;
DROP POLICY IF EXISTS "Discovered spots: insert by authenticated" ON public.discovered_spots;
DROP POLICY IF EXISTS "Discovered spots: update by authenticated" ON public.discovered_spots;
DROP POLICY IF EXISTS "Discovered spots: select own" ON public.discovered_spots;
DROP POLICY IF EXISTS "Discovered spots: insert own" ON public.discovered_spots;
DROP POLICY IF EXISTS "Discovered spots: update own" ON public.discovered_spots;
DROP POLICY IF EXISTS "Discovered spots: delete own" ON public.discovered_spots;

CREATE POLICY "Discovered spots: select own" ON public.discovered_spots
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = created_by);

CREATE POLICY "Discovered spots: insert own" ON public.discovered_spots
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "Discovered spots: update own" ON public.discovered_spots
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = created_by)
  WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "Discovered spots: delete own" ON public.discovered_spots
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = created_by);

-- Public-safe projection: no creator/user id is returned. Coordinates describe
-- a parking location, not a user, and are rounded to ~1 metre precision.
CREATE OR REPLACE FUNCTION public.get_discovered_spots_public(_limit integer DEFAULT 200)
RETURNS TABLE(
  id uuid,
  spot_id text,
  lat double precision,
  lng double precision,
  address text,
  visit_count integer,
  first_seen_at timestamptz,
  last_seen_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    d.id,
    d.spot_id,
    round(d.lat::numeric, 5)::double precision,
    round(d.lng::numeric, 5)::double precision,
    d.address,
    d.visit_count,
    d.first_seen_at,
    d.last_seen_at
  FROM public.discovered_spots d
  WHERE d.visit_count > 0
  ORDER BY d.visit_count DESC, d.last_seen_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 500);
$$;

REVOKE ALL ON FUNCTION public.get_discovered_spots_public(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_discovered_spots_public(integer) TO anon, authenticated;

-- Legacy view is not needed by the client and should not be publicly queryable.
REVOKE ALL ON public.spot_activity_stats FROM anon, authenticated;

-- Explicitly keep direct access to personal session coordinates private.
DROP POLICY IF EXISTS "Sessions: select own" ON public.sessions;
CREATE POLICY "Sessions: select own" ON public.sessions
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- Prevent unbounded or unexpected statuses at the database boundary.
ALTER TABLE public.spot_reports DROP CONSTRAINT IF EXISTS spot_reports_status_check;
ALTER TABLE public.spot_reports
  ADD CONSTRAINT spot_reports_status_check CHECK (status IN ('free','busy','full'));
