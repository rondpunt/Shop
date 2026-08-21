import { fail, findStripeCustomerForUser, getStripeServer, readJsonBody, requireUser, safeReturnUrl } from "./_shared.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const user = await requireUser(req);
    const { returnUrl } = await readJsonBody(req);
    if (!user.email) return res.status(400).json({ error: "Account heeft geen e-mailadres" });

    const stripe = getStripeServer();
    const customer = await findStripeCustomerForUser(stripe, user);
    if (!customer) return res.status(404).json({ error: "Geen abonnementsklant gevonden" });

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: safeReturnUrl(req, returnUrl, "/premium"),
    });
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ url: session.url });
  } catch (error) {
    return fail(res, error);
  }
}
