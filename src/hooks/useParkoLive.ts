import { useEffect, useRef, useState } from "react";

export type ParkoBay = {
  id: string;
  lat: number;
  lng: number;
  state: "free" | "occupied" | "unknown";
};
export type ParkoZone = {
  id: string;
  name: string;
  municipality: string;
  lat: number;
  lng: number;
  totalBays: number;
  freeBays: number;
  occupiedBays: number;
  unknownBays: number;
  bays: ParkoBay[];
};
export type ParkoPayload = {
  fetchedAt: string;
  zones: ParkoZone[];
  totalFree: number;
  totalBays: number;
};

const REFRESH_MS = 30_000;

/**
 * Live Parko Shop&Go availability via our Vercel proxy.
 * Keeps the last successful payload visible while refreshing every 30 seconds.
 */
export const useParkoLive = () => {
  const [data, setData] = useState<ParkoPayload | null>(() => {
    try {
      const cached = localStorage.getItem("shopgo_parko_cache");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!data);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dataRef = useRef<ParkoPayload | null>(data);
  const mountedRef = useRef(true);
  const loadRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    mountedRef.current = true;

    const load = async () => {
      const hasData = !!dataRef.current;
      if (hasData) setRefreshing(true);
      else setLoading(true);

      try {
        const response = await fetch("/api/parko-states", { cache: "no-store" });
        if (!mountedRef.current) return;
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Server error: ${response.status}`);
        }

        const payload = (await response.json()) as ParkoPayload;
        dataRef.current = payload;
        setData(payload);
        try {
          localStorage.setItem("shopgo_parko_cache", JSON.stringify(payload));
        } catch (e) {
          console.warn("Failed to cache parko live states", e);
        }
        setError(null);
      } catch (e) {
        if (!mountedRef.current) return;
        setError(e instanceof Error ? e.message : "Kon live data niet laden");
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    loadRef.current = load;
    void load();
    const t = window.setInterval(() => void load(), REFRESH_MS);

    return () => {
      mountedRef.current = false;
      window.clearInterval(t);
    };
  }, []);

  const refresh = () => loadRef.current();

  return { data, loading, refreshing, error, refresh };
};

/** Find the nearest Parko zone within `maxKm` of the given coordinates. */
export const nearestZone = (
  zones: ParkoZone[],
  lat: number,
  lng: number,
  maxKm = 0.15
): ParkoZone | null => {
  let best: { z: ParkoZone; d: number } | null = null;
  for (const z of zones) {
    const dLat = (z.lat - lat) * 111;
    const dLng = (z.lng - lng) * 70;
    const d = Math.hypot(dLat, dLng);
    if (d <= maxKm && (!best || d < best.d)) best = { z, d };
  }
  return best?.z ?? null;
};