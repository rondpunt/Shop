import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

let initPromise: Promise<typeof globalThis.google> | null = null;
let cachedKey: string | null = null;

async function resolveGoogleMapsKey(): Promise<string | null> {
  if (cachedKey) return cachedKey;

  const directKey =
    import.meta.env.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    "";

  if (directKey) {
    cachedKey = directKey;
    return directKey;
  }

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (projectId && anonKey) {
    try {
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/maps-config`, {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          "Content-Type": "application/json",
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data?.apiKey === "string" && data.apiKey.length > 10) {
          cachedKey = data.apiKey;
          return data.apiKey;
        }
      }
    } catch (error) {
      console.warn("Google Maps configuration endpoint is temporarily unavailable", error);
    }
  }

  return null;
}

/** True when a browser Maps key is available (env or Supabase maps-config). */
export async function isGoogleMapsConfigured(): Promise<boolean> {
  const key = await resolveGoogleMapsKey();
  return !!key;
}

export function loadGoogleMaps(): Promise<typeof globalThis.google> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const apiKey = await resolveGoogleMapsKey();
    if (!apiKey) {
      initPromise = null;
      throw new Error("Google Maps is tijdelijk niet geconfigureerd.");
    }

    setOptions({ key: apiKey, v: "weekly" });
    await importLibrary("maps");
    await importLibrary("marker");
    return globalThis.google;
  })().catch((error) => {
    initPromise = null;
    throw error;
  });

  return initPromise;
}
