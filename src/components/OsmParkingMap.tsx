import { useEffect, useRef } from "react";
import { Locate, Plus, Minus } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ParkoZone } from "@/hooks/useParkoLive";
import { buildPinSvg, KORTRIJK_CENTER, userLocationSvg } from "@/lib/mapShared";
import { cn } from "@/lib/utils";

type Props = {
  userCoords: { lat: number; lng: number } | null;
  zones: ParkoZone[];
  recommendedZoneId?: string | null;
  onZoneTap?: (zone: ParkoZone) => void;
  height?: number | string;
  bottomPadding?: number;
  className?: string;
  showControls?: boolean;
};

/** Dark Carto basemap — no API key required. */
const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export const OsmParkingMap = ({
  userCoords,
  zones,
  recommendedZoneId,
  onZoneTap,
  height = 240,
  bottomPadding = 220,
  className,
  showControls = true,
}: Props) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const userMarker = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const center = userCoords ?? KORTRIJK_CENTER;
    const map = L.map(mapRef.current, {
      center: [center.lat, center.lng],
      zoom: 16,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    markersLayer.current = L.layerGroup().addTo(map);
    mapInstance.current = map;

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
    if (!map || !userCoords) return;

    if (userMarker.current) {
      userMarker.current.remove();
    }

    const icon = L.divIcon({
      className: "shopgo-user-marker",
      html: userLocationSvg,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    userMarker.current = L.marker([userCoords.lat, userCoords.lng], { icon, zIndexOffset: 9999 }).addTo(map);
  }, [userCoords]);

  useEffect(() => {
    const map = mapInstance.current;
    const layer = markersLayer.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const visible = zones.filter((z) => z.freeBays > 0);
    for (const z of visible) {
      const selected = z.id === recommendedZoneId;
      const svg = buildPinSvg(z, selected);
      const size = selected ? 54 : 48;
      const icon = L.divIcon({
        className: "shopgo-zone-marker",
        html: svg,
        iconSize: [size, Math.round(size * 1.25)],
        iconAnchor: [size / 2, Math.round(size * 1.25) - 4],
      });

      const marker = L.marker([z.lat, z.lng], {
        icon,
        zIndexOffset: selected ? 1000 : 100,
        title: z.name,
      });

      if (onZoneTap) {
        marker.on("click", () => onZoneTap(z));
      }
      layer.addLayer(marker);
    }
  }, [zones, recommendedZoneId, onZoneTap]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !recommendedZoneId) return;

    const selected = zones.find((z) => z.id === recommendedZoneId);
    if (!selected) return;

    if (!userCoords) {
      map.setView([selected.lat, selected.lng], 16, { animate: true });
      return;
    }

    const bounds = L.latLngBounds(
      [userCoords.lat, userCoords.lng],
      [selected.lat, selected.lng],
    );
    map.fitBounds(bounds, {
      paddingTopLeft: [36, 118],
      paddingBottomRight: [36, Math.max(120, bottomPadding)],
      maxZoom: 17,
      animate: true,
    });
  }, [recommendedZoneId, zones, userCoords, bottomPadding]);

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
      <div ref={mapRef} className="h-full w-full" />
      <div className="pointer-events-none absolute left-3 top-3 z-[400] rounded-full bg-card/90 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground shadow-elevated backdrop-blur">
        OpenStreetMap
      </div>
      {showControls && (
        <div className="absolute bottom-3 right-3 z-[400] flex flex-col gap-1.5">
          <div className="flex flex-col rounded-full bg-card shadow-elevated">
            <button
              type="button"
              onClick={() => osmMapControls.zoom(mapInstance.current, 1)}
              className="grid h-9 w-9 place-items-center text-foreground hover:bg-muted active:scale-95"
              aria-label="Inzoomen"
            >
              <Plus className="h-4 w-4" />
            </button>
            <div className="mx-2 h-px bg-border" />
            <button
              type="button"
              onClick={() => osmMapControls.zoom(mapInstance.current, -1)}
              className="grid h-9 w-9 place-items-center text-foreground hover:bg-muted active:scale-95"
              aria-label="Uitzoomen"
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => osmMapControls.recenter(mapInstance.current, userCoords)}
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

export const osmMapControls = {
  recenter: (map: L.Map | null, userCoords: { lat: number; lng: number } | null) => {
    if (!map) return;
    if (userCoords) {
      map.setView([userCoords.lat, userCoords.lng], 17, { animate: true });
    } else {
      map.setView([KORTRIJK_CENTER.lat, KORTRIJK_CENTER.lng], 15, { animate: true });
    }
  },
  zoom: (map: L.Map | null, delta: number) => {
    if (!map) return;
    map.setZoom(map.getZoom() + delta);
  },
};
