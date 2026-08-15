-- Switch helper functions to SECURITY INVOKER (they only insert into tables the caller is allowed to write via RLS)
CREATE OR REPLACE FUNCTION public.on_session_insert_track_spot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_spot_id text;
BEGIN
  IF NEW.spot_id IS NOT NULL AND length(NEW.spot_id) > 0 THEN
    v_spot_id := NEW.spot_id;
  ELSIF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    v_spot_id := 'geo:' || round(NEW.lat::numeric, 5)::text || ',' || round(NEW.lng::numeric, 5)::text;
    NEW.spot_id := v_spot_id;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.spot_reports (spot_id, status, user_id, lat, lng, note)
  VALUES (v_spot_id, 'busy', NEW.user_id, NEW.lat, NEW.lng, 'auto: session started');

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

CREATE OR REPLACE FUNCTION public.on_session_end_release_spot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
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

-- Tighten UPDATE policy on discovered_spots: must stay authenticated and cannot reassign created_by
DROP POLICY IF EXISTS "Discovered spots: update by authenticated" ON public.discovered_spots;
CREATE POLICY "Discovered spots: update by authenticated"
  ON public.discovered_spots FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);