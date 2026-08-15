const PARKO_URL = "https://shop.parko.be/m/restv1/parkodata/ShopAndGoStates";

const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "");
const normaliseState = (s: string) => {
  const v = String(s || "").toLowerCase();
  if (v === "free") return "free";
  if (v === "occupied") return "occupied";
  return "unknown";
};

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    let upstream: Response;
    try {
      upstream = await fetch(PARKO_URL, {
        headers: { Accept: "application/json", "User-Agent": "shopgo-kortrijk/2.0" },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!upstream.ok) throw new Error(`Parko upstream status ${upstream.status}`);
    const data = await upstream.json() as any[];
    if (!Array.isArray(data)) throw new Error("Parko returned an invalid payload");

    const zoneMap = new Map<string, any>();
    for (const z of data) {
      if (!z || !Number.isFinite(Number(z.latitude)) || !Number.isFinite(Number(z.longitude))) continue;
      const key = `${String(z.municipality || "Kortrijk")}-${slug(String(z.name || "Shop&Go"))}`;
      const bays = (Array.isArray(z.sensors) ? z.sensors : []).map((s: any) => ({
        id: String(s.parkingBay || ""),
        lat: Number(s.latitude),
        lng: Number(s.longitude),
        state: normaliseState(s.state),
      })).filter((b: any) => b.id && Number.isFinite(b.lat) && Number.isFinite(b.lng));
      const freeBays = bays.filter((b: any) => b.state === "free").length;
      const occupiedBays = bays.filter((b: any) => b.state === "occupied").length;
      const unknownBays = bays.filter((b: any) => b.state === "unknown").length;
      const existing = zoneMap.get(key);
      if (existing) {
        existing.totalBays += bays.length;
        existing.freeBays += freeBays;
        existing.occupiedBays += occupiedBays;
        existing.unknownBays += unknownBays;
        existing.bays.push(...bays);
      } else {
        zoneMap.set(key, {
          id: key,
          name: String(z.name || "Shop&Go"),
          municipality: String(z.municipality || "Kortrijk"),
          lat: Number(z.latitude),
          lng: Number(z.longitude),
          totalBays: bays.length,
          freeBays,
          occupiedBays,
          unknownBays,
          bays,
        });
      }
    }

    const zones = Array.from(zoneMap.values());
    res.setHeader("Cache-Control", "public, s-maxage=20, stale-while-revalidate=40");
    return res.status(200).json({
      fetchedAt: new Date().toISOString(),
      zones,
      totalFree: zones.reduce((n: number, z: any) => n + z.freeBays, 0),
      totalBays: zones.reduce((n: number, z: any) => n + z.totalBays, 0),
    });
  } catch (error) {
    console.error("Parko proxy failed", error);
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ error: "Live parkeerdata tijdelijk niet beschikbaar" });
  }
}
