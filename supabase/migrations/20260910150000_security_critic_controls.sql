-- Security Critic controls: timer_sessions, feed_cache, webhook idempotency, subscriptions uniqueness.

CREATE TABLE IF NOT EXISTS public.timer_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spot_id text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS timer_sessions_user_started_idx
  ON public.timer_sessions (user_id, started_at DESC);

ALTER TABLE public.timer_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.timer_sessions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.timer_sessions TO authenticated;

CREATE POLICY "Timer sessions: select own" ON public.timer_sessions
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Writes only via service_role + start_timer_session (SECURITY DEFINER).

CREATE TABLE IF NOT EXISTS public.feed_cache (
  cache_key text PRIMARY KEY,
  payload jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feed_cache_expires_idx ON public.feed_cache (expires_at);

ALTER TABLE public.feed_cache ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.feed_cache FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stripe_webhook_events_processed_idx
  ON public.stripe_webhook_events (processed_at DESC);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.stripe_webhook_events FROM PUBLIC, anon, authenticated;

-- One subscription row per Shop&Go user (fail-closed binding).
DELETE FROM public.subscriptions a
USING public.subscriptions b
WHERE a.user_id = b.user_id
  AND a.created_at < b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_unique
  ON public.subscriptions (user_id);

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
  session_row public.timer_sessions%ROWTYPE;
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
  FROM public.timer_sessions ts
  WHERE ts.user_id = uid
    AND ts.started_at >= now() - interval '1 minute';

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

  INSERT INTO public.timer_sessions (
    user_id,
    spot_id,
    started_at,
    ends_at
  )
  VALUES (
    uid,
    spot,
    started,
    ends
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
      'used', usage_row.starts_count,
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
