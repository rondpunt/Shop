-- Lock down spot_reports: hide user_id and precise coords from public.
-- 1. Drop the overly-permissive public SELECT policy
DROP POLICY IF EXISTS "Spot reports: public read" ON public.spot_reports;

-- 2. Allow authenticated users to read only their own raw rows (with user_id, lat, lng, note)
CREATE POLICY "Spot reports: select own"
  ON public.spot_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Create a public-safe view exposing only non-identifying signal data
CREATE OR REPLACE VIEW public.spot_reports_public
WITH (security_invoker = on) AS
SELECT
  id,
  spot_id,
  status,
  created_at
FROM public.spot_reports;

GRANT SELECT ON public.spot_reports_public TO anon, authenticated;