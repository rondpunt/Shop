-- Fix discovered_spots INSERT policy: require created_by = auth.uid(), no NULL owner
DROP POLICY IF EXISTS "Discovered spots: insert by authenticated" ON public.discovered_spots;

CREATE POLICY "Discovered spots: insert own"
ON public.discovered_spots
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Lock down SECURITY DEFINER helper: revoke from anon, keep for authenticated
REVOKE EXECUTE ON FUNCTION public.increment_discovered_spot_visit(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_discovered_spot_visit(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_discovered_spot_visit(text) TO authenticated;