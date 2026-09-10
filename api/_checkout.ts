import type Stripe from "stripe";
import { findStripeCustomerForUser, getStripeServer, safeReturnUrl } from "./_shared.js";

const allowedLookupKeys = new Set(["premium_monthly", "premium_yearly"]);

export type CreateCheckoutInput = {
  req: unknown;
  user: { id: string; email?: string | null };
  priceId: unknown;
  returnUrl?: unknown;
  cancelUrl?: unknown;
};

export const createCheckoutSession = async ({
  req,
  user,
  priceId,
  returnUrl,
  cancelUrl,
}: CreateCheckoutInput) => {
  const lookupKey = String(priceId || "");
  if (!allowedLookupKeys.has(lookupKey)) {
    throw Object.assign(new Error("Ongeldig abonnement"), { statusCode: 400 });
  }

  const successUrl = safeReturnUrl(
    req,
    returnUrl,
    "/premium?checkout=success&session_id={CHECKOUT_SESSION_ID}",
  );
  const canceledUrl = safeReturnUrl(req, cancelUrl, "/premium?checkout=canceled");

  const stripe = getStripeServer();
  const prices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  const price = prices.data[0];
  if (!price) throw Object.assign(new Error("Prijs niet gevonden"), { statusCode: 404 });

  let customer = await findStripeCustomerForUser(stripe, user);
  if (!customer) {
    customer = await stripe.customers.create({
      email: user.email || undefined,
      metadata: { shopgoUserId: user.id },
    });
  } else if (customer.metadata?.shopgoUserId !== user.id) {
    await stripe.customers.update(customer.id, { metadata: { shopgoUserId: user.id } });
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    line_items: [{ price: price.id, quantity: 1 }],
    mode: price.type === "recurring" ? "subscription" : "payment",
    ui_mode: "embedded",
    return_url: successUrl,
    cancel_url: canceledUrl,
    customer: customer.id,
    client_reference_id: user.id,
    metadata: { userId: user.id, shopgoUserId: user.id },
    ...(price.type === "recurring"
      ? { subscription_data: { metadata: { userId: user.id, shopgoUserId: user.id } } }
      : {}),
  };

  const session = await stripe.checkout.sessions.create(sessionParams);
  if (!session.client_secret) {
    throw Object.assign(new Error("Checkout kon niet worden gestart"), { statusCode: 503 });
  }

  return { clientSecret: session.client_secret, sessionId: session.id };
};
