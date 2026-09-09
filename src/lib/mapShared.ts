import type { ParkoZone } from "@/hooks/useParkoLive";

export type ZoneMarkerStatus = "free" | "warn" | "full" | "unknown";

export const KORTRIJK_CENTER = { lat: 50.8267, lng: 3.2647 };

export const zoneStatus = (z: ParkoZone): ZoneMarkerStatus => {
  if (z.totalBays === 0) return "unknown";
  if (z.freeBays === 0) return "full";
  if (z.freeBays <= 3) return "warn";
  return "free";
};

export const statusColor = (s: ZoneMarkerStatus): string => {
  if (s === "free") return "#00C896";
  if (s === "warn") return "#FFA500";
  if (s === "full") return "#FF4757";
  return "#6B7280";
};

export const pinLabel = (z: ParkoZone, s: ZoneMarkerStatus): string => {
  if (s === "full") return "0";
  if (s === "unknown") return "?";
  return String(z.freeBays);
};

/** SVG parking pin used by Google Maps and Leaflet div icons. */
export const buildPinSvg = (z: ParkoZone, selected: boolean): string => {
  const s = zoneStatus(z);
  const color = statusColor(s);
  const label = pinLabel(z, s);
  const size = selected ? 54 : 48;
  const fontSize = z.freeBays >= 100 ? 14 : z.freeBays >= 10 ? 18 : 20;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size * 1.25)}" viewBox="0 0 48 60">
    <path d="M24 2C12.4 2 3 11.4 3 23c0 11.5 14.6 27.5 19.4 32.6a2.2 2.2 0 0 0 3.2 0C30.4 50.5 45 34.5 45 23 45 11.4 35.6 2 24 2Z"
          fill="${color}" stroke="rgba(255,255,255,0.9)" stroke-width="2"/>
    <text x="24" y="29" text-anchor="middle" dominant-baseline="middle"
          font-family="Inter, system-ui, sans-serif" font-weight="800" font-size="${fontSize}"
          fill="#ffffff">${label}</text>
  </svg>`;
};

export const userLocationSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="13" fill="#3b82f6" fill-opacity="0.25"/>
  <circle cx="16" cy="16" r="7" fill="#3b82f6" stroke="#ffffff" stroke-width="3"/>
</svg>`;
