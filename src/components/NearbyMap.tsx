import { useState } from "react";
import { resolveMapProvider, type MapProvider } from "@/lib/mapProvider";
import { NearbyMapGoogle } from "@/components/NearbyMapGoogle";
import { NearbyMapOsm, type NearbyMapBaseProps } from "@/components/NearbyMapOsm";

export type { NearbyMapBaseProps };

/**
 * Map with OpenStreetMap (Leaflet) by default.
 * Google Maps is used only when VITE_USE_GOOGLE_MAPS=true with a browser key,
 * with automatic OSM fallback if Google fails to load.
 */
export const NearbyMap = (props: NearbyMapBaseProps) => {
  const [provider, setProvider] = useState<MapProvider>(() => resolveMapProvider());

  if (provider === "google") {
    return (
      <NearbyMapGoogle
        {...props}
        onLoadFailed={() => setProvider("osm")}
      />
    );
  }

  return <NearbyMapOsm {...props} />;
};
