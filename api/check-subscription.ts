import { fail, getAdminClient, getStripeServer, readJsonBody, requireUser } from "./_shared.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const user = await requireUser(req);
    const { environment = "live" } = await readJsonBody(req);
    const env = environment === "sandbox" ? "sandbox" : "live";
    if (!user.email) return res.status(200).json({ status: "none" });

    const stripe = getStripeServer();
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customer = customers.data[0];
    if (!customer) return res.status(200).json({ status: "none" });

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 10,
    });
    const sub = subscriptions.data
      .sort((a: any, b: any) => Number(b.created || 0) - Number(a.created || 0))[0];
    if (!sub) return res.status(200).json({ status: "none" });

    const row = {
      user_id: user.id,
      environment: env,
      stripe_customer_id: customer.id,
      stripe_subscription_id: sub.id,
      status: sub.status,
      price_id: sub.items.data[0]?.price?.id ?? null,
      product_id:
        typeof sub.items.data[0]?.price?.product === "string"
          ? sub.items.data[0].price.product
          : null,
      current_period_end: sub.items.data[0]?.current_period_end
        ? new Date(sub.items.data[0].current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    };

    const supabaseAdmin = getAdminClient();
    const { data: existing } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("environment", env)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      await supabaseAdmin.from("subscriptions").update(row).eq("id", existing.id);
    } else {
      await supabaseAdmin.from("subscriptions").insert(row);
    }

    return res.status(200).json({
      status: sub.status,
      current_period_end: row.current_period_end,
      cancel_at_period_end: row.cancel_at_period_end,
    });
  } catch (error) {
    return fail(res, error);
  }
}
