import { fail, getStripeServer, readJsonBody, requireUser } from "./_shared";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const user = await requireUser(req);
    const { returnUrl } = await readJsonBody(req);
    if (!user.email) return res.status(400).json({ error: "Account heeft geen e-mailadres" });

    const stripe = getStripeServer();
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customer = customers.data[0];
    if (!customer) return res.status(404).json({ error: "Geen Stripe-klant gevonden" });

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: String(returnUrl || `${req.headers?.origin || ""}/premium`),
    });
    return res.status(200).json({ url: session.url });
  } catch (error) {
    return fail(res, error);
  }
}
