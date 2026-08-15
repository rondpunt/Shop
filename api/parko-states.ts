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
    const upstream = await fetch(PARKO_URL, {
      headers: { Accept: "application/json", "User-Agent": "shopgo-kortrijk/2.0" },
    });
    if (!upstream.ok) throw new Error(`Parko upstream ${upstream.status}`);
    const data = await upstream.json() as any[];
    const zoneMap = new Map<string, any>();

    for (const z of data) {
      const key = `${z.municipality}-${slug(z.name)}`;
      const bays = (z.sensors ?? []).map((s: any) => ({
        id: s.parkingBay,
        lat: s.latitude,
        lng: s.longitude,
        state: normaliseState(s.state),
      }));
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
          name: z.name,
          municipality: z.municipality,
          lat: z.latitude,
          lng: z.longitude,
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
  } catch (error: any) {
    console.error("Parko proxy failed", error);
    return res.status(502).json({ error: error?.message || "Live parkeerdata niet beschikbaar" });
  }
}
