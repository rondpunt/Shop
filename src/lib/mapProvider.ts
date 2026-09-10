export type MapProvider = "google" | "osm";

function googleMapsKey(): string {
  return (
    import.meta.env.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    ""
  );
}

export function hasGoogleMapsKey(): boolean {
  return googleMapsKey().length > 10;
}

/**
 * Resolve which map backend to use.
 * - `osm`: Leaflet + OpenStreetMap (default — no dev watermark).
 * - `google`: Google Maps JS (only when VITE_USE_GOOGLE_MAPS=true and a key is set).
 * - `auto` (default): OSM unless production Google is explicitly opted in.
 */
export function resolveMapProvider(): MapProvider {
  const pref = (import.meta.env.VITE_MAP_PROVIDER as string | undefined)?.toLowerCase();

  if (pref === "osm") return "osm";
  if (pref === "google") return hasGoogleMapsKey() ? "google" : "osm";

  if (import.meta.env.VITE_USE_GOOGLE_MAPS === "true" && hasGoogleMapsKey()) {
    return "google";
  }

  return "osm";
}

export function mapProviderLabel(provider: MapProvider): string {
  return provider === "google" ? "Google Maps" : "OpenStreetMap";
}
