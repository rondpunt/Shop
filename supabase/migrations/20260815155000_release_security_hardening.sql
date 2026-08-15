-- Shop&Go Kortrijk release hardening
-- Applied to the existing production Supabase database before beta publication.

-- Least-privilege table grants. Public/anonymous consumers use privacy-preserving RPCs.
REVOKE ALL PRIVILEGES ON TABLE public.cars, public.discovered_spots, public.profiles, public.sessions, public.spot_reports, public.subscriptions FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.cars, public.discovered_spots, public.profiles, public.sessions, public.spot_reports, public.subscriptions FROM authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.spot_reports_public, public.spot_activity_stats FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cars TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.discovered_spots TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.spot_reports TO authenticated;
GRANT SELECT ON TABLE public.subscriptions TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_discovered_spots_public(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_spot_forecast_public() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_spot_reports_public(text, integer) TO anon, authenticated;

-- Trigger helpers are internal and must not be client-callable.
REVOKE EXECUTE ON FUNCTION public.protect_trial_ends_at() FROM PUBLIC, anon, authenticated;

-- Prevent ownership reassignment on car updates.
DROP POLICY IF EXISTS "Cars: update own" ON public.cars;
CREATE POLICY "Cars: update own" ON public.cars
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

-- Remove an obsolete duplicate read policy.
DROP POLICY IF EXISTS "Discovered spots: read own" ON public.discovered_spots;

-- Permissive RLS SELECT policies are ORed. Keep exactly one history policy so the
-- free 60-day entitlement is not bypassed by a broader ownership-only policy.
DROP POLICY IF EXISTS "Sessions: select own" ON public.sessions;
DROP POLICY IF EXISTS "Sessions: select own with history limit" ON public.sessions;
CREATE POLICY "Sessions: select own with history limit" ON public.sessions
FOR SELECT TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  AND (
    public.is_premium((SELECT auth.uid()))
    OR started_at > (now() - interval '60 days')
  )
);
