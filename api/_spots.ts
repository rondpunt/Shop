import { SHOPGO_SPOTS } from "../src/data/shopgo-spots.js";
import {
  getSpotsCacheKey,
  getSpotsCacheTtlSeconds,
  readFeedCache,
  writeFeedCache,
} from "./_feedCache.js";

export type SpotStatus = "free" | "occupied" | "unknown";

export type SpotDto = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  address?: string;
  status: SpotStatus;
  updatedAt: string;
};

export type SpotsResponse = {
  spots: SpotDto[];
  cachedAt: string;
  stale: boolean;
};

const PARKO_URL = "https://shop.parko.be/m/restv1/parkodata/ShopAndGoStates";

const slug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normaliseState = (value: string): SpotStatus => {
  const v = String(value || "").toLowerCase();
  if (v === "free") return "free";
  if (v === "occupied") return "occupied";
  return "unknown";
};

type ParkoZone = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  freeBays: number;
  occupiedBays: number;
  unknownBays: number;
};

const zoneStatus = (zone: ParkoZone): SpotStatus => {
  if (zone.freeBays > 0) return "free";
  if (zone.occupiedBays > 0 && zone.freeBays === 0) return "occupied";
  if (zone.unknownBays > 0 && zone.freeBays === 0 && zone.occupiedBays === 0) return "unknown";
  return "unknown";
};

const fetchParkoZones = async (): Promise<{ zones: ParkoZone[]; fetchedAt: string }> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const upstream = await fetch(PARKO_URL, {
      headers: { Accept: "application/json", "User-Agent": "shopgo-kortrijk/2.0" },
      signal: controller.signal,
    });
    if (!upstream.ok) throw new Error(`Parko upstream status ${upstream.status}`);
    const data = (await upstream.json()) as unknown[];
    if (!Array.isArray(data)) throw new Error("Parko returned an invalid payload");

    const zoneMap = new Map<string, ParkoZone>();
    for (const raw of data) {
      const z = raw as Record<string, unknown>;
      if (!Number.isFinite(Number(z.latitude)) || !Number.isFinite(Number(z.longitude))) continue;
      const key = `${String(z.municipality || "Kortrijk")}-${slug(String(z.name || "Shop&Go"))}`;
      const sensors = Array.isArray(z.sensors) ? z.sensors : [];
      const bays = sensors.map((sensor) => {
        const s = sensor as Record<string, unknown>;
        return normaliseState(String(s.state || ""));
      });
      const freeBays = bays.filter((state) => state === "free").length;
      const occupiedBays = bays.filter((state) => state === "occupied").length;
      const unknownBays = bays.filter((state) => state === "unknown").length;
      const existing = zoneMap.get(key);
      if (existing) {
        existing.freeBays += freeBays;
        existing.occupiedBays += occupiedBays;
        existing.unknownBays += unknownBays;
      } else {
        zoneMap.set(key, {
          id: key,
          name: String(z.name || "Shop&Go"),
          lat: Number(z.latitude),
          lng: Number(z.longitude),
          freeBays,
          occupiedBays,
          unknownBays,
        });
      }
    }

    return { zones: Array.from(zoneMap.values()), fetchedAt: new Date().toISOString() };
  } finally {
    clearTimeout(timeout);
  }
};

const mockSpots = (updatedAt: string): SpotDto[] =>
  SHOPGO_SPOTS.map((spot) => ({
    id: `shopgo:${spot.id}`,
    lat: spot.lat,
    lng: spot.lng,
    label: spot.name,
    address: spot.street,
    status: "unknown" as const,
    updatedAt,
  }));

const buildFreshSpotsResponse = async (): Promise<SpotsResponse> => {
  const cachedAt = new Date().toISOString();
  try {
    const { zones, fetchedAt } = await fetchParkoZones();
    const spots: SpotDto[] = zones.map((zone) => ({
      id: `parko:${zone.id}`,
      lat: zone.lat,
      lng: zone.lng,
      label: zone.name,
      address: zone.name,
      status: zoneStatus(zone),
      updatedAt: fetchedAt,
    }));

    const parkoIds = new Set(zones.map((zone) => zone.id));
    for (const spot of SHOPGO_SPOTS) {
      if (parkoIds.has(spot.id)) continue;
      spots.push({
        id: `shopgo:${spot.id}`,
        lat: spot.lat,
        lng: spot.lng,
        label: spot.name,
        address: spot.street,
        status: "unknown",
        updatedAt: fetchedAt,
      });
    }

    return { spots, cachedAt: fetchedAt, stale: false };
  } catch (error) {
    console.error("Parko fetch failed; returning mock spots", error);
    return { spots: mockSpots(cachedAt), cachedAt, stale: true };
  }
};

export const buildSpotsResponse = async (): Promise<SpotsResponse> => {
  try {
    const cached = await readFeedCache<SpotsResponse>(getSpotsCacheKey());
    if (cached) return cached;
  } catch {
    // feed_cache unavailable — fall through to live fetch
  }

  const fresh = await buildFreshSpotsResponse();
  try {
    await writeFeedCache(getSpotsCacheKey(), fresh, getSpotsCacheTtlSeconds());
  } catch {
    // cache write failure must not break the response
  }
  return fresh;
};

export const isAllowedSpotId = (spotId: string): boolean =>
  /^(parko:|shopgo:)[a-z0-9-]+$/.test(spotId);
