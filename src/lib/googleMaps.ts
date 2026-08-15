import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

let initPromise: Promise<typeof globalThis.google> | null = null;

export function loadGoogleMaps(): Promise<typeof globalThis.google> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // 1. Check if there is a direct Google Maps key in environment variables
    const directKey =
      process.env.GOOGLE_MAPS_PLATFORM_KEY ||
      import.meta.env.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
      "";

    let apiKey = directKey;

    if (!apiKey) {
      // 2. Fallback to Supabase Edge Function if no direct key is configured
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (projectId && anonKey) {
        try {
          const res = await fetch(
            `https://${projectId}.supabase.co/functions/v1/maps-config`,
            {
              method: "POST",
              headers: {
                apikey: anonKey,
                Authorization: `Bearer ${anonKey}`,
                "Content-Type": "application/json",
              },
            },
          );
          if (res.ok) {
            const data = await res.json();
            if (data?.apiKey) {
              apiKey = data.apiKey;
            }
          }
        } catch (error) {
          console.warn("Could not load Google Maps key from Supabase Edge Function:", error);
        }
      }
    }

    if (!apiKey) {
      initPromise = null;
      throw new Error("Google Maps API-sleutel ontbreekt. Voeg GOOGLE_MAPS_PLATFORM_KEY toe aan de Secrets.");
    }

    setOptions({ key: apiKey, v: "weekly" });
    await importLibrary("maps");
    await importLibrary("marker");
    return globalThis.google;
  })();

  return initPromise;
}
