import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

let initPromise: Promise<typeof globalThis.google> | null = null;

export function loadGoogleMaps(): Promise<typeof globalThis.google> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Browser Maps keys are publishable credentials: keep them API/quota restricted.
    // Never put server credentials or service-account secrets in a VITE_* variable.
    const directKey =
      import.meta.env.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
      "";

    let apiKey = directKey;

    if (!apiKey) {
      // Backward-compatible fallback for the existing Supabase project. The function
      // should return a Maps browser key only, never a server/service credential.
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
            if (typeof data?.apiKey === "string" && data.apiKey.length > 10) apiKey = data.apiKey;
          }
        } catch (error) {
          console.warn("Google Maps configuration endpoint is temporarily unavailable", error);
        }
      }
    }

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
