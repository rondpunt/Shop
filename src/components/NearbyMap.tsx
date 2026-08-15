/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { Locate, Loader2, Plus, Minus } from "lucide-react";
import { loadGoogleMaps } from "@/lib/googleMaps";
import type { ParkoZone } from "@/hooks/useParkoLive";
import { cn } from "@/lib/utils";

type Filter = "free" | "all";

type Props = {
  userCoords: { lat: number; lng: number } | null;
  zones: ParkoZone[];
  recommendedZoneId?: string | null;
  /** Tap a marker → select it in the parent UI. */
  onZoneTap?: (zone: ParkoZone) => void;
  /** Auto height fills container when omitted. */
  height?: number | string;
  /** Show built-in filter chips (default true). */
  showFilters?: boolean;
  /** Initial filter state. */
  initialFilter?: Filter;
  /** Extra lower map padding reserved for the visible bottom sheet. */
  bottomPadding?: number;
  className?: string;
};

const KORTRIJK_CENTER = { lat: 50.8267, lng: 3.2647 };

/* Existing Shop&Go night-mode map style. */
const NIGHT_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0f1626" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f1626" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#e8edf5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#cfd8e8" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#16331f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9c7c" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e2a44" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0a0f1c" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9aa9c4" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2a3a5e" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#0a0f1c" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#c8d2e6" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a1428" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4a6896" }] },
];

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

/** Existing pin shape, selected state only ~12.5% larger. */
const buildPinIcon = (z: ParkoZone, selected: boolean) => {
  const s = statusFor(z);
  const color = colorFor(s);
  const label = s === "full" ? "0" : s === "unknown" ? "?" : String(z.freeBays);
  const size = selected ? 54 : 48;
  const fontSize = z.freeBays >= 100 ? 14 : z.freeBays >= 10 ? 18 : 20;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size * 1.25)}" viewBox="0 0 48 60">
    <path d="M24 2C12.4 2 3 11.4 3 23c0 11.5 14.6 27.5 19.4 32.6a2.2 2.2 0 0 0 3.2 0C30.4 50.5 45 34.5 45 23 45 11.4 35.6 2 24 2Z"
          fill="${color}" stroke="rgba(255,255,255,0.9)" stroke-width="2"/>
    <text x="24" y="29" text-anchor="middle" dominant-baseline="middle"
          font-family="Inter, system-ui, sans-serif" font-weight="800" font-size="${fontSize}"
          fill="#ffffff">${label}</text>
  </svg>`;

  return {
    url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, Math.round(size * 1.25)),
    anchor: new google.maps.Point(size / 2, Math.round(size * 1.25) - 4),
  };
};

export const NearbyMap = ({
  userCoords,
  zones,
  recommendedZoneId,
  onZoneTap,
  height = 240,
  showFilters = true,
  initialFilter = "free",
  bottomPadding = 220,
  className,
}: Props) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarker = useRef<google.maps.Marker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>(initialFilter);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const google = await loadGoogleMaps();
        if (cancelled || !mapRef.current) return;
        const center = userCoords ?? KORTRIJK_CENTER;
        mapInstance.current = new google.maps.Map(mapRef.current, {
          center,
          zoom: 16,
          mapTypeId: "roadmap",
          disableDefaultUI: true,
          zoomControl: false,
          gestureHandling: "greedy",
          clickableIcons: false,
          backgroundColor: "#1A1D2E",
          styles: NIGHT_STYLE,
        });
        setLoading(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Kaart kon niet laden");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !userCoords) return;
    if (userMarker.current) userMarker.current.setMap(null);
    const userSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="13" fill="#3b82f6" fill-opacity="0.25"/>
      <circle cx="16" cy="16" r="7" fill="#3b82f6" stroke="#ffffff" stroke-width="3"/>
    </svg>`;
    userMarker.current = new google.maps.Marker({
      map,
      position: userCoords,
      icon: {
        url: `data:image/svg+xml;utf8,${encodeURIComponent(userSvg)}`,
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 16),
      },
      zIndex: 9999,
    });
  }, [userCoords, loading]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const visible = zones.filter((z) => (filter === "free" ? z.freeBays > 0 : true));

    for (const z of visible) {
      const selected = z.id === recommendedZoneId;
      const marker = new google.maps.Marker({
        map,
        position: { lat: z.lat, lng: z.lng },
        icon: buildPinIcon(z, selected),
        title: z.name,
        zIndex: selected ? 1000 : 100,
      });
      if (onZoneTap) marker.addListener("click", () => onZoneTap(z));
      markersRef.current.push(marker);
    }
  }, [zones, filter, recommendedZoneId, onZoneTap, loading]);

  // Keep user + selected Shop&Go visible above the current sheet state.
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || loading || !recommendedZoneId) return;
    const selected = zones.find((z) => z.id === recommendedZoneId);
    if (!selected) return;

    const selectedPos = { lat: selected.lat, lng: selected.lng };
    if (!userCoords) {
      map.panTo(selectedPos);
      map.setZoom(16);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(userCoords);
    bounds.extend(selectedPos);
    map.fitBounds(bounds, {
      top: 118,
      right: 36,
      bottom: Math.max(120, bottomPadding),
      left: 36,
    });

    const listener = google.maps.event.addListenerOnce(map, "idle", () => {
      if ((map.getZoom() ?? 16) > 17) map.setZoom(17);
    });
    return () => google.maps.event.removeListener(listener);
  }, [recommendedZoneId, zones, userCoords, bottomPadding, loading]);

  const recenter = () => {
    const map = mapInstance.current;
    if (!map) return;
    if (userCoords) {
      map.panTo(userCoords);
      map.setZoom(17);
    } else {
      map.panTo(KORTRIJK_CENTER);
      map.setZoom(15);
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
        className
      )}
      style={heightStyle}
    >
      <div ref={mapRef} className="h-full w-full" />

      {loading && (
        <div className="absolute inset-0 grid place-items-center bg-deep">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}
      {error && !loading && (
        <div className="absolute inset-0 grid place-items-center bg-deep px-4 text-center text-xs text-white/70">
          <div>
            <div className="mb-2">{error}</div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
            >
              Kaart opnieuw laden
            </button>
          </div>
        </div>
      )}

      {showFilters && !loading && !error && (
        <div className="absolute left-3 top-3 z-[1] flex gap-1 rounded-full bg-card/95 p-1 shadow-elevated backdrop-blur">
          {([
            { id: "free", label: "Vrij" },
            { id: "all", label: "Alle" },
          ] as { id: Filter; label: string }[]).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-bold transition-base",
                filter === f.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {!loading && !error && (
        <div className="absolute bottom-3 right-3 z-[1] flex flex-col gap-1.5">
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