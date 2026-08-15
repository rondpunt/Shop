import { fail, getStripeServer, readJsonBody, requireUser } from "./_shared";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const user = await requireUser(req);
    const { priceId, returnUrl } = await readJsonBody(req);
    if (!priceId || !returnUrl) return res.status(400).json({ error: "Missing parameters" });

    const stripe = getStripeServer();
    const prices = await stripe.prices.list({ lookup_keys: [String(priceId)], active: true, limit: 1 });
    const price = prices.data[0];
    if (!price) return res.status(404).json({ error: "Prijs niet gevonden in Stripe" });

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: price.id, quantity: 1 }],
      mode: price.type === "recurring" ? "subscription" : "payment",
      ui_mode: "embedded",
      return_url: String(returnUrl),
      customer_email: user.email || undefined,
      client_reference_id: user.id,
      metadata: { userId: user.id },
      ...(price.type === "recurring" ? { subscription_data: { metadata: { userId: user.id } } } : {}),
    });

    if (!session.client_secret) throw new Error("Stripe gaf geen checkout client secret terug");
    return res.status(200).json({ clientSecret: session.client_secret });
  } catch (error) {
    return fail(res, error);
  }
}
