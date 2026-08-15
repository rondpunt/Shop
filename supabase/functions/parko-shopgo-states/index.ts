// Live Parko Shop&Go availability proxy.
// Source: https://shop.parko.be/m/restv1/parkodata/ShopAndGoStates
// Why a proxy: Parko's API has no CORS headers, so browsers can't call it directly.
// We also normalize the payload and cache for 20s to be polite.

import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.105.0/cors";

const PARKO_URL = "https://shop.parko.be/m/restv1/parkodata/ShopAndGoStates";
const CACHE_TTL_MS = 20_000;

type ParkoSensor = {
  function: string;
  latitude: number;
  longitude: number;
  name: string;
  parkingBay: string;
  state: "Free" | "Occupied" | "Unknown" | string;
};
type ParkoZone = {
  freePlaces: number;
  latitude: number;
  longitude: number;
  municipality: string;
  name: string;
  sensors: ParkoSensor[];
};

type Bay = {
  id: string;
  lat: number;
  lng: number;
  state: "free" | "occupied" | "unknown";
};
type Zone = {
  id: string;
  name: string;
  municipality: string;
  lat: number;
  lng: number;
  totalBays: number;
  freeBays: number;
  occupiedBays: number;
  unknownBays: number;
  bays: Bay[];
};
type Payload = {
  fetchedAt: string;
  zones: Zone[];
  totalFree: number;
  totalBays: number;
};

let cache: { at: number; payload: Payload } | null = null;

const slug = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "");

const normaliseState = (s: string): Bay["state"] => {
  const v = s.toLowerCase();
  if (v === "free") return "free";
  if (v === "occupied") return "occupied";
  return "unknown";
};

const fetchAndNormalise = async (): Promise<Payload> => {
  const res = await fetch(PARKO_URL, {
    headers: { Accept: "application/json", "User-Agent": "shopgo-kortrijk/1.0" },
  });
  if (!res.ok) throw new Error(`Parko upstream ${res.status}`);
  const data = (await res.json()) as ParkoZone[];

  const zones: Zone[] = data.map((z) => {
    const bays: Bay[] = (z.sensors ?? []).map((s) => ({
      id: s.parkingBay,
      lat: s.latitude,
      lng: s.longitude,
      state: normaliseState(s.state),
    }));
    const freeBays = bays.filter((b) => b.state === "free").length;
    const occupiedBays = bays.filter((b) => b.state === "occupied").length;
    const unknownBays = bays.filter((b) => b.state === "unknown").length;
    return {
      id: `${z.municipality}-${slug(z.name)}`,
      name: z.name,
      municipality: z.municipality,
      lat: z.latitude,
      lng: z.longitude,
      totalBays: bays.length,
      freeBays,
      occupiedBays,
      unknownBays,
      bays,
    };
  });

  return {
    fetchedAt: new Date().toISOString(),
    zones,
    totalFree: zones.reduce((a, z) => a + z.freeBays, 0),
    totalBays: zones.reduce((a, z) => a + z.totalBays, 0),
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const now = Date.now();
    if (!cache || now - cache.at > CACHE_TTL_MS) {
      cache = { at: now, payload: await fetchAndNormalise() };
    }
    return new Response(JSON.stringify(cache.payload), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=20",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    console.error("parko-shopgo-states error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
