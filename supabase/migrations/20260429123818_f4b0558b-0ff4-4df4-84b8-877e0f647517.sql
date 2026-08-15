CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'none',
  price_id text,
  product_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX subscriptions_user_env_idx ON public.subscriptions (user_id, environment, created_at DESC);
CREATE UNIQUE INDEX subscriptions_stripe_sub_idx ON public.subscriptions (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subscriptions: select own"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies → only service role (edge functions) can write.

CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;