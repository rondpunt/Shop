import { enforceSpotsIpRateLimit } from "./_rateLimit.js";
import { buildSpotsResponse } from "./_spots.js";
import { fail } from "./_shared.js";

export default async function handler(req: { method?: string; headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }, res: any) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    await enforceSpotsIpRateLimit(req);
  } catch (error) {
    return fail(res, error);
  }

  const payload = await buildSpotsResponse();
  res.setHeader("Cache-Control", "public, s-maxage=20, stale-while-revalidate=60");
  return res.status(200).json(payload);
}
