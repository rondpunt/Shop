import type { ParkoZone } from "@/hooks/useParkoLive";

/** Haversine-light: km between two latlng points (good enough for city distances). */
export const distKm = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) => {
  const dLat = (a.lat - b.lat) * 111;
  const dLng = (a.lng - b.lng) * 70;
  return Math.hypot(dLat, dLng);
};

export const formatDist = (km: number) =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

/** Driving time @ 30km/h, in minutes (rounded up, min 1). */
export const driveMin = (km: number) => Math.max(1, Math.ceil((km / 30) * 60));
/** Walking time at avg 80 m/min, rounded to nearest minute (min 1). */
export const walkMin = (km: number) => Math.max(1, Math.round((km * 1000) / 80));

export type ZoneStatus = "free" | "warn" | "full" | "unknown";

export const zoneStatus = (z: ParkoZone): ZoneStatus => {
  if (z.totalBays === 0) return "unknown";
  if (z.freeBays === 0) return "full";
  if (z.freeBays <= 3) return "warn";
  return "free";
};

export const navigateTo = (z: { lat: number; lng: number }) => {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${z.lat},${z.lng}&travelmode=driving`;
  window.open(url, "_blank", "noopener,noreferrer");
};
