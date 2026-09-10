-- Security Critic MUST FIX: timer_sessions write lockdown + IP rate-limit store.

-- Writes only via service_role + start_timer_session (SECURITY DEFINER).
DROP POLICY IF EXISTS "Timer sessions: insert own" ON public.timer_sessions;
DROP POLICY IF EXISTS "Timer sessions: update own" ON public.timer_sessions;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.timer_sessions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.timer_sessions TO authenticated;

CREATE TABLE IF NOT EXISTS public.api_ip_rate_limits (
  bucket_key text PRIMARY KEY,
  hit_count integer NOT NULL DEFAULT 1 CHECK (hit_count >= 0),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS api_ip_rate_limits_expires_idx
  ON public.api_ip_rate_limits (expires_at);

ALTER TABLE public.api_ip_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.api_ip_rate_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_ip_rate_limit(
  _bucket_key text,
  _max_hits integer,
  _window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_count integer;
BEGIN
  IF _bucket_key IS NULL OR btrim(_bucket_key) = '' THEN
    RETURN false;
  END IF;

  IF _max_hits <= 0 OR _window_seconds <= 0 THEN
    RETURN false;
  END IF;

  DELETE FROM public.api_ip_rate_limits WHERE expires_at <= now();

  INSERT INTO public.api_ip_rate_limits (bucket_key, hit_count, expires_at)
  VALUES (
    _bucket_key,
    1,
    now() + make_interval(secs => _window_seconds)
  )
  ON CONFLICT (bucket_key) DO UPDATE
    SET
      hit_count = CASE
        WHEN public.api_ip_rate_limits.expires_at <= now() THEN 1
        ELSE public.api_ip_rate_limits.hit_count + 1
      END,
      expires_at = CASE
        WHEN public.api_ip_rate_limits.expires_at <= now() THEN
          now() + make_interval(secs => _window_seconds)
        ELSE public.api_ip_rate_limits.expires_at
      END
  RETURNING hit_count INTO next_count;

  RETURN next_count <= _max_hits;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ip_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ip_rate_limit(text, integer, integer) TO service_role;
