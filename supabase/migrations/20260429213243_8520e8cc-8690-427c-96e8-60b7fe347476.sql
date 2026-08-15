CREATE OR REPLACE FUNCTION public.increment_discovered_spot_visit(_spot_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  UPDATE public.discovered_spots
     SET visit_count = visit_count + 1,
         last_seen_at = now()
   WHERE spot_id = _spot_id;
END;
$function$;