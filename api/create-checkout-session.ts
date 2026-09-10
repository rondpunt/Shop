import { createCheckoutSession } from "./_checkout.js";
import { fail, readJsonBody, requireUser } from "./_shared.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const user = await requireUser(req);
    const body = await readJsonBody(req);
    const result = await createCheckoutSession({
      req,
      user,
      priceId: body.priceId,
      returnUrl: body.returnUrl,
      cancelUrl: body.cancelUrl,
    });

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(result);
  } catch (error) {
    return fail(res, error);
  }
}
