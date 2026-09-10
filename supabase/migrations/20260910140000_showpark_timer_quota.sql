-- Showpark Shop&Go demo: server-side timer quota (10 free starts) + atomic session start.

CREATE TABLE IF NOT EXISTS public.timer_usage (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  starts_count integer NOT NULL DEFAULT 0 CHECK (starts_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.timer_usage ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.timer_usage FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.start_timer_session(_user_id uuid, _spot_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := _user_id;
  spot text := btrim(coalesce(_spot_id, ''));
  premium boolean;
  usage_row public.timer_usage%ROWTYPE;
  recent_starts integer;
  session_row public.sessions%ROWTYPE;
  free_limit constant integer := 10;
  duration_minutes constant integer := 30;
  started timestamptz := now();
  ends timestamptz := started + make_interval(mins => duration_minutes);
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF spot = '' OR char_length(spot) > 128 THEN
    RAISE EXCEPTION 'Invalid spotId' USING ERRCODE = '22023';
  END IF;

  IF spot !~ '^(parko:|shopgo:)[a-z0-9-]+$' THEN
    RAISE EXCEPTION 'Invalid spotId format' USING ERRCODE = '22023';
  END IF;

  SELECT count(*)::integer
  INTO recent_starts
  FROM public.sessions s
  WHERE s.user_id = uid
    AND s.started_at >= now() - interval '1 minute';

  IF recent_starts >= 6 THEN
    RAISE EXCEPTION 'Rate limit exceeded' USING ERRCODE = '53300';
  END IF;

  premium := public.is_premium(uid);

  INSERT INTO public.timer_usage (user_id, starts_count)
  VALUES (uid, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT *
  INTO usage_row
  FROM public.timer_usage
  WHERE user_id = uid
  FOR UPDATE;

  IF NOT premium AND usage_row.starts_count >= free_limit THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'PAYWALL',
      'paywall', jsonb_build_object(
        'reason', 'free_quota_exceeded',
        'freeLimit', free_limit,
        'used', usage_row.starts_count,
        'message', 'Je gratis timerbeurten zijn op. Neem Premium om verder te gaan.'
      ),
      'usage', jsonb_build_object(
        'used', usage_row.starts_count,
        'limit', free_limit,
        'remaining', greatest(free_limit - usage_row.starts_count, 0),
        'isPremium', false
      )
    );
  END IF;

  IF NOT premium THEN
    UPDATE public.timer_usage
      SET starts_count = starts_count + 1,
          updated_at = now()
    WHERE user_id = uid
    RETURNING * INTO usage_row;
  END IF;

  INSERT INTO public.sessions (
    user_id,
    spot_id,
    started_at,
    ends_at,
    address
  )
  VALUES (
    uid,
    spot,
    started,
    ends,
    NULL
  )
  RETURNING * INTO session_row;

  RETURN jsonb_build_object(
    'ok', true,
    'session', jsonb_build_object(
      'id', session_row.id,
      'spotId', session_row.spot_id,
      'startedAt', session_row.started_at,
      'endsAt', session_row.ends_at,
      'endedAt', session_row.ended_at
    ),
    'usage', jsonb_build_object(
      'used', CASE WHEN premium THEN usage_row.starts_count ELSE usage_row.starts_count END,
      'limit', free_limit,
      'remaining', CASE
        WHEN premium THEN NULL
        ELSE greatest(free_limit - usage_row.starts_count, 0)
      END,
      'isPremium', premium
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.start_timer_session(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_timer_session(uuid, text) TO service_role;
