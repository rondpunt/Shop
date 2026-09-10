import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Locate, Loader2, Plus, Minus } from "lucide-react";
import type { ParkoZone } from "@/hooks/useParkoLive";
import { cn } from "@/lib/utils";

type Filter = "free";

export type NearbyMapBaseProps = {
  userCoords: { lat: number; lng: number } | null;
  zones: ParkoZone[];
  recommendedZoneId?: string | null;
  onZoneTap?: (zone: ParkoZone) => void;
  height?: number | string;
  showFilters?: boolean;
  initialFilter?: Filter;
  bottomPadding?: number;
  className?: string;
};

const KORTRIJK_CENTER = { lat: 50.8267, lng: 3.2647 };

const OSM_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const statusFor = (z: ParkoZone): "free" | "warn" | "full" | "unknown" => {
  if (z.totalBays === 0) return "unknown";
  if (z.freeBays === 0) return "full";
  if (z.freeBays <= 3) return "warn";
  return "free";
};

const colorFor = (s: ReturnType<typeof statusFor>) => {
  if (s === "free") return "#00C896";
  if (s === "warn") return "#FFA500";
  if (s === "full") return "#FF4757";
  return "#6B7280";
};

const buildPinIcon = (z: ParkoZone, selected: boolean): L.DivIcon => {
  const s = statusFor(z);
  const color = colorFor(s);
  const label = s === "full" ? "0" : s === "unknown" ? "?" : String(z.freeBays);
  const size = selected ? 54 : 48;
  const fontSize = z.freeBays >= 100 ? 14 : z.freeBays >= 10 ? 18 : 20;
  const html = `<div style="width:${size}px;height:${Math.round(size * 1.25)}px">
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size * 1.25)}" viewBox="0 0 48 60">
      <path d="M24 2C12.4 2 3 11.4 3 23c0 11.5 14.6 27.5 19.4 32.6a2.2 2.2 0 0 0 3.2 0C30.4 50.5 45 34.5 45 23 45 11.4 35.6 2 24 2Z"
            fill="${color}" stroke="rgba(255,255,255,0.9)" stroke-width="2"/>
      <text x="24" y="29" text-anchor="middle" dominant-baseline="middle"
            font-family="Inter, system-ui, sans-serif" font-weight="800" font-size="${fontSize}"
            fill="#ffffff">${label}</text>
    </svg>
  </div>`;
  return L.divIcon({
    html,
    className: "shopgo-osm-pin",
    iconSize: [size, Math.round(size * 1.25)],
    iconAnchor: [size / 2, Math.round(size * 1.25) - 4],
  });
};

const userIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="13" fill="#3b82f6" fill-opacity="0.25"/>
    <circle cx="16" cy="16" r="7" fill="#3b82f6" stroke="#ffffff" stroke-width="3"/>
  </svg>`,
  className: "shopgo-osm-user",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export const NearbyMapOsm = ({
  userCoords,
  zones,
  recommendedZoneId,
  onZoneTap,
  height = 240,
  showFilters = true,
  initialFilter = "free",
  bottomPadding = 220,
  className,
}: NearbyMapBaseProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const userMarker = useRef<L.Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [filter] = useState<Filter>(initialFilter);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const center = userCoords ?? KORTRIJK_CENTER;
    const map = L.map(mapRef.current, {
      center: [center.lat, center.lng],
      zoom: 16,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer(OSM_TILES, {
      maxZoom: 19,
      attribution: OSM_ATTRIBUTION,
    }).addTo(map);

    markersLayer.current = L.layerGroup().addTo(map);
    mapInstance.current = map;
    setReady(true);

    return () => {
      map.remove();
      mapInstance.current = null;
      markersLayer.current = null;
      userMarker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !ready) return;

    if (userMarker.current) {
      userMarker.current.remove();
      userMarker.current = null;
    }
    if (userCoords) {
      userMarker.current = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon, zIndexOffset: 9999 }).addTo(map);
    }
  }, [userCoords, ready]);

  useEffect(() => {
    const map = mapInstance.current;
    const layer = markersLayer.current;
    if (!map || !layer || !ready) return;

    layer.clearLayers();
    const visible = zones.filter((z) => z.freeBays > 0);

    for (const z of visible) {
      const selected = z.id === recommendedZoneId;
      const marker = L.marker([z.lat, z.lng], {
        icon: buildPinIcon(z, selected),
        zIndexOffset: selected ? 1000 : 100,
      });
      if (onZoneTap) marker.on("click", () => onZoneTap(z));
      marker.addTo(layer);
    }
  }, [zones, filter, recommendedZoneId, onZoneTap, ready]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !ready || !recommendedZoneId) return;
    const selected = zones.find((z) => z.id === recommendedZoneId);
    if (!selected) return;

    if (!userCoords) {
      map.setView([selected.lat, selected.lng], 16);
      return;
    }

    const bounds = L.latLngBounds(
      [userCoords.lat, userCoords.lng],
      [selected.lat, selected.lng],
    );
    map.fitBounds(bounds, {
      paddingTopLeft: [36, 118],
      paddingBottomRight: [36, Math.max(120, bottomPadding)],
    });
    window.setTimeout(() => {
      if ((map.getZoom() ?? 16) > 17) map.setZoom(17);
    }, 100);
  }, [recommendedZoneId, zones, userCoords, bottomPadding, ready]);

  const recenter = () => {
    const map = mapInstance.current;
    if (!map) return;
    if (userCoords) {
      map.setView([userCoords.lat, userCoords.lng], 17);
    } else {
      map.setView([KORTRIJK_CENTER.lat, KORTRIJK_CENTER.lng], 15);
    }
  };

  const zoom = (delta: number) => {
    const map = mapInstance.current;
    if (!map) return;
    map.setZoom((map.getZoom() ?? 16) + delta);
  };

  const heightStyle = typeof height === "number" ? { height } : { height };

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-deep",
        typeof height === "number" && "rounded-2xl shadow-elevated",
        className,
      )}
      style={heightStyle}
    >
      <div ref={mapRef} className="h-full w-full z-0" />

      {!ready && (
        <div className="absolute inset-0 grid place-items-center bg-deep">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}

      {showFilters && ready && (
        <div className="absolute left-3 top-3 z-[401] flex gap-1 rounded-full bg-card/95 p-1 shadow-elevated backdrop-blur">
          <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground">
            Vrije plaatsen
          </span>
        </div>
      )}

      {ready && (
        <div className="absolute bottom-3 right-3 z-[401] flex flex-col gap-1.5">
          <div className="flex flex-col rounded-full bg-card shadow-elevated">
            <button
              type="button"
              onClick={() => zoom(1)}
              className="grid h-9 w-9 place-items-center text-foreground hover:bg-muted active:scale-95"
              aria-label="Inzoomen"
            >
              <Plus className="h-4 w-4" />
            </button>
            <div className="mx-2 h-px bg-border" />
            <button
              type="button"
              onClick={() => zoom(-1)}
              className="grid h-9 w-9 place-items-center text-foreground hover:bg-muted active:scale-95"
              aria-label="Uitzoomen"
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={recenter}
            className="grid h-10 w-10 place-items-center rounded-full bg-card text-primary shadow-elevated transition-base hover:bg-muted active:scale-95"
            aria-label="Centreer op mijn locatie"
          >
            <Locate className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};
