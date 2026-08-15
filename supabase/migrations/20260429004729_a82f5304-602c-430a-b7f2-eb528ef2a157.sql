-- Restrict public read on discovered_spots: only authenticated users can read
DROP POLICY IF EXISTS "Discovered spots: public read" ON public.discovered_spots;

CREATE POLICY "Discovered spots: authenticated read"
ON public.discovered_spots
FOR SELECT
TO authenticated
USING (true);