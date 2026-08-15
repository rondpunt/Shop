import { useEffect, useState, useRef } from "react";

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
 * Live Parko Shop&Go availability via our edge proxy.
 * Auto-refreshes every 30s while mounted.
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
  const [error, setError] = useState<string | null>(null);

  const dataRef = useRef<ParkoPayload | null>(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/parko-states");
        if (!active) return;
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Server error: ${response.status}`);
        }
        
        const payload = await response.json();
        setData(payload as ParkoPayload);
        try {
          localStorage.setItem("shopgo_parko_cache", JSON.stringify(payload));
        } catch (e) {
          console.warn("Failed to cache parko live states", e);
        }
        setError(null);
      } catch (e) {
        if (!active) return;
        // Only set error if we don't have cached data to show
        if (!dataRef.current) {
          setError(e instanceof Error ? e.message : "Kon live data niet laden");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  return { data, loading, error };
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
