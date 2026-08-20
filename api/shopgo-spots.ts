import { SHOPGO_SPOTS } from "../src/data/shopgo-spots.js";

export default function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=3600");
  return res.status(200).json({
    spots: SHOPGO_SPOTS,
    count: SHOPGO_SPOTS.length,
    updated_at: new Date().toISOString(),
    disclaimer: "Shop&Go-locaties als fallback. Live beschikbaarheid komt van Parko.",
  });
}
