import { fail, getStripeServer, readJsonBody, requireUser, safeReturnUrl } from "./_shared.js";

const allowedLookupKeys = new Set(["premium_monthly", "premium_yearly"]);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const user = await requireUser(req);
    const { priceId, returnUrl } = await readJsonBody(req);
    const lookupKey = String(priceId || "");
    if (!allowedLookupKeys.has(lookupKey)) {
      return res.status(400).json({ error: "Ongeldig abonnement" });
    }

    const safeReturn = safeReturnUrl(
      req,
      returnUrl,
      "/premium?checkout=success&session_id={CHECKOUT_SESSION_ID}",
    );

    const stripe = getStripeServer();
    const prices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
    const price = prices.data[0];
    if (!price) return res.status(404).json({ error: "Prijs niet gevonden" });

    const customer = await stripe.customers.create({
      email: user.email || undefined,
      metadata: { shopgoUserId: user.id },
    });
    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: price.id, quantity: 1 }],
      mode: price.type === "recurring" ? "subscription" : "payment",
      ui_mode: "embedded",
      return_url: safeReturn,
      customer: customer.id,
      client_reference_id: user.id,
      metadata: { userId: user.id },
      ...(price.type === "recurring"
        ? { subscription_data: { metadata: { userId: user.id } } }
        : {}),
    });

    if (!session.client_secret) throw new Error("Checkout kon niet worden gestart");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ clientSecret: session.client_secret });
  } catch (error) {
    return fail(res, error);
  }
}
