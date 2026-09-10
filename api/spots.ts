import { buildSpotsResponse } from "./_spots.js";

export default async function handler(req: { method?: string }, res: any) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const payload = await buildSpotsResponse();
  res.setHeader("Cache-Control", "public, s-maxage=20, stale-while-revalidate=60");
  return res.status(200).json(payload);
}
