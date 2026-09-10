import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { hasGoogleMapsKey, resolveMapProvider } from "@/lib/mapProvider";

describe("mapProvider", () => {
  const env = import.meta.env;

  beforeEach(() => {
    vi.stubEnv("VITE_GOOGLE_MAPS_PLATFORM_KEY", "");
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "");
    vi.stubEnv("VITE_MAP_PROVIDER", "auto");
    vi.stubEnv("VITE_USE_GOOGLE_MAPS", "false");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    void env;
  });

  it("defaults to OSM when Google is not explicitly enabled", () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_PLATFORM_KEY", "AIzaSyDevKeyThatIsLongEnough1234567890");
    expect(hasGoogleMapsKey()).toBe(true);
    expect(resolveMapProvider()).toBe("osm");
  });

  it("uses Google when opted in with a key", () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_PLATFORM_KEY", "AIzaSyProductionKeyLongEnough123456");
    vi.stubEnv("VITE_USE_GOOGLE_MAPS", "true");
    expect(resolveMapProvider()).toBe("google");
  });

  it("forces OSM when VITE_MAP_PROVIDER=osm", () => {
    vi.stubEnv("VITE_MAP_PROVIDER", "osm");
    vi.stubEnv("VITE_USE_GOOGLE_MAPS", "true");
    expect(resolveMapProvider()).toBe("osm");
  });
});
