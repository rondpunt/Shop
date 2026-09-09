/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { Locate, Loader2, Plus, Minus } from "lucide-react";
import { loadGoogleMaps, isGoogleMapsConfigured } from "@/lib/googleMaps";
import type { ParkoZone } from "@/hooks/useParkoLive";
import { cn } from "@/lib/utils";
import {
  buildPinSvg,
  KORTRIJK_CENTER,
  userLocationSvg,
  zoneStatus,
} from "@/lib/mapShared";
import { OsmParkingMap } from "@/components/OsmParkingMap";

type Filter = "free";
type MapEngine = "loading" | "google" | "osm";

type Props = {
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

const buildPinIcon = (z: ParkoZone, selected: boolean) => {
  const s = zoneStatus(z);
  const size = selected ? 54 : 48;
  const svg = buildPinSvg(z, selected);
  return {
    url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, Math.round(size * 1.25)),
    anchor: new google.maps.Point(size / 2, Math.round(size * 1.25) - 4),
  };
};

const MapControls = ({
  onRecenter,
  onZoomIn,
  onZoomOut,
}: {
  onRecenter: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}) => (
  <div className="absolute bottom-3 right-3 z-[1] flex flex-col gap-1.5">
    <div className="flex flex-col rounded-full bg-card shadow-elevated">
      <button
        type="button"
        onClick={onZoomIn}
        className="grid h-9 w-9 place-items-center text-foreground hover:bg-muted active:scale-95"
        aria-label="Inzoomen"
      >
        <Plus className="h-4 w-4" />
      </button>
      <div className="mx-2 h-px bg-border" />
      <button
        type="button"
        onClick={onZoomOut}
        className="grid h-9 w-9 place-items-center text-foreground hover:bg-muted active:scale-95"
        aria-label="Uitzoomen"
      >
        <Minus className="h-4 w-4" />
      </button>
    </div>
    <button
      type="button"
      onClick={onRecenter}
      className="grid h-10 w-10 place-items-center rounded-full bg-card text-primary shadow-elevated transition-base hover:bg-muted active:scale-95"
      aria-label="Centreer op mijn locatie"
    >
      <Locate className="h-4 w-4" />
    </button>
  </div>
);

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
  const [engine, setEngine] = useState<MapEngine>("loading");
  const [filter] = useState<Filter>(initialFilter);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const hasKey = await isGoogleMapsConfigured();
      if (cancelled) return;

      if (!hasKey) {
        setEngine("osm");
        return;
      }

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
        setEngine("google");
      } catch (e) {
        console.warn("Google Maps failed, falling back to OpenStreetMap", e);
        if (!cancelled) setEngine("osm");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || engine !== "google" || !userCoords) return;
    if (userMarker.current) userMarker.current.setMap(null);
    userMarker.current = new google.maps.Marker({
      map,
      position: userCoords,
      icon: {
        url: `data:image/svg+xml;utf8,${encodeURIComponent(userLocationSvg)}`,
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 16),
      },
      zIndex: 9999,
    });
  }, [userCoords, engine]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || engine !== "google") return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const visible = zones.filter((z) => z.freeBays > 0);
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
  }, [zones, filter, recommendedZoneId, onZoneTap, engine]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || engine !== "google" || !recommendedZoneId) return;
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
  }, [recommendedZoneId, zones, userCoords, bottomPadding, engine]);

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

  if (engine === "osm") {
    return (
      <div className={cn("relative", className)} style={heightStyle}>
        <OsmParkingMap
          userCoords={userCoords}
          zones={zones}
          recommendedZoneId={recommendedZoneId}
          onZoneTap={onZoneTap}
          height={height}
          bottomPadding={bottomPadding}
          className={className}
        />
        {showFilters && (
          <div className="absolute left-3 top-3 z-[500] flex gap-1 rounded-full bg-card/95 p-1 shadow-elevated backdrop-blur">
            <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground">
              Vrije plaatsen
            </span>
          </div>
        )}
      </div>
    );
  }

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

      {engine === "loading" && (
        <div className="absolute inset-0 grid place-items-center bg-deep">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}

      {showFilters && engine === "google" && (
        <div className="absolute left-3 top-3 z-[1] flex gap-1 rounded-full bg-card/95 p-1 shadow-elevated backdrop-blur">
          <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground">
            Vrije plaatsen
          </span>
        </div>
      )}

      {engine === "google" && (
        <MapControls onRecenter={recenter} onZoomIn={() => zoom(1)} onZoomOut={() => zoom(-1)} />
      )}
    </div>
  );
};
