import { createClient } from "npm:@supabase/supabase-js@2";
import { createStripeClient, type StripeEnv } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const environment: StripeEnv = body.environment === "live" ? "live" : "sandbox";

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user || !user.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = createStripeClient(environment);

    // Find Stripe customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (!customers.data.length) {
      // No customer = no sub. Upsert a 'none' row so client knows.
      await supabase.from("subscriptions").upsert(
        {
          user_id: user.id,
          status: "none",
          environment,
        } as never,
        { onConflict: "stripe_subscription_id" } as never,
      ).then(() => {});
      return new Response(JSON.stringify({ status: "none" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const customer = customers.data[0];

    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 1,
    });

    if (!subs.data.length) {
      return new Response(JSON.stringify({ status: "none" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sub = subs.data[0];
    const item = sub.items.data[0];
    const priceObj = item?.price;
    const periodEnd = (item as { current_period_end?: number } | undefined)?.current_period_end
      ?? (sub as unknown as { current_period_end?: number }).current_period_end;

    // Resolve human-readable price id via lookup_key
    const lookupKey = priceObj?.lookup_key ?? null;

    const row = {
      user_id: user.id,
      stripe_customer_id: customer.id,
      stripe_subscription_id: sub.id,
      status: sub.status,
      price_id: lookupKey,
      product_id: typeof priceObj?.product === "string" ? priceObj.product : priceObj?.product?.id ?? null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: !!sub.cancel_at_period_end,
      environment,
    };

    await supabase
      .from("subscriptions")
      .upsert(row as never, { onConflict: "stripe_subscription_id" } as never);

    return new Response(JSON.stringify({ status: sub.status, ...row }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-subscription error", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
