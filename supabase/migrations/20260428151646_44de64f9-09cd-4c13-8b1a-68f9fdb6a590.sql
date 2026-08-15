
-- Tighten discovered_spots UPDATE: only the creator may update; for crowd visit counts, expose a controlled RPC
DROP POLICY IF EXISTS "Discovered spots: update by authenticated" ON public.discovered_spots;

CREATE POLICY "Discovered spots: update own"
  ON public.discovered_spots
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Controlled crowd increment: anyone authenticated can bump visit_count + last_seen_at, nothing else.
CREATE OR REPLACE FUNCTION public.increment_discovered_spot_visit(_spot_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  UPDATE public.discovered_spots
     SET visit_count = visit_count + 1,
         last_seen_at = now()
   WHERE spot_id = _spot_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_discovered_spot_visit(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_discovered_spot_visit(text) TO authenticated;

-- Remove spot_reports from realtime publication: SELECT RLS restricts rows to the owner,
-- but Realtime broadcasts row changes regardless, leaking other users' reports.
ALTER PUBLICATION supabase_realtime DROP TABLE public.spot_reports;
