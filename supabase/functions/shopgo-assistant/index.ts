// AI parking assistant for Shop&Go in Kortrijk.
// Uses Lovable AI Gateway (no API key needed by the user).
//
// Body:
//   { question?: string, lat?: number, lng?: number, hour?: number, weekday?: number }
//
// Returns:
//   { advice: string, top_spots: { id, name, distance_m, score, reason }[] }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Spot = {
  id: string;
  name: string;
  street: string;
  lat: number;
  lng: number;
  bays: number;
  verification: "official" | "manual" | "unverified";
};

// Keep server-side curated list (mirror of shopgo-spots).
const SPOTS: Spot[] = [
  { id: "grote-markt",            name: "Grote Markt",            street: "Grote Markt",                  lat: 50.8275, lng: 3.2647, bays: 8, verification: "manual" },
  { id: "leiestraat",             name: "Leiestraat",             street: "Leiestraat",                   lat: 50.8268, lng: 3.2632, bays: 6, verification: "manual" },
  { id: "korte-steenstraat",      name: "Korte Steenstraat",      street: "Korte Steenstraat",            lat: 50.8262, lng: 3.2638, bays: 4, verification: "manual" },
  { id: "lange-steenstraat",      name: "Lange Steenstraat",      street: "Lange Steenstraat",            lat: 50.8255, lng: 3.2630, bays: 5, verification: "manual" },
  { id: "doorniksestraat",        name: "Doorniksestraat",        street: "Doorniksestraat",              lat: 50.8240, lng: 3.2660, bays: 7, verification: "manual" },
  { id: "doorniksewijk",          name: "Doorniksewijk",          street: "Doorniksewijk",                lat: 50.8215, lng: 3.2685, bays: 6, verification: "manual" },
  { id: "rijselsestraat",         name: "Rijselsestraat",         street: "Rijselsestraat",               lat: 50.8248, lng: 3.2608, bays: 5, verification: "manual" },
  { id: "graanmarkt",             name: "Graanmarkt",             street: "Graanmarkt",                   lat: 50.8278, lng: 3.2660, bays: 6, verification: "manual" },
  { id: "vlasmarkt",              name: "Vlasmarkt",              street: "Vlasmarkt",                    lat: 50.8272, lng: 3.2655, bays: 5, verification: "manual" },
  { id: "houtmarkt",              name: "Houtmarkt",              street: "Houtmarkt",                    lat: 50.8258, lng: 3.2655, bays: 5, verification: "manual" },
  { id: "schouwburgplein",        name: "Schouwburgplein",        street: "Schouwburgplein",              lat: 50.8252, lng: 3.2670, bays: 4, verification: "manual" },
  { id: "veemarkt",               name: "Veemarkt",               street: "Veemarkt",                     lat: 50.8298, lng: 3.2650, bays: 6, verification: "manual" },
  { id: "noordstraat",            name: "Noordstraat",            street: "Noordstraat",                  lat: 50.8265, lng: 3.2615, bays: 5, verification: "manual" },
  { id: "groeningestraat",        name: "Groeningestraat",        street: "Groeningestraat",              lat: 50.8232, lng: 3.2670, bays: 4, verification: "manual" },
  { id: "olv-straat",             name: "O.L.V.-straat",          street: "Onze-Lieve-Vrouwestraat",      lat: 50.8285, lng: 3.2645, bays: 4, verification: "manual" },
  { id: "sint-amandsplein",       name: "Sint-Amandsplein",       street: "Sint-Amandsplein",             lat: 50.8278, lng: 3.2680, bays: 4, verification: "manual" },
];

const distanceM = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

// Heuristic occupancy probability (0=likely free, 1=likely full).
// Saturday late-morning + Wednesday-market mornings are the busiest in Kortrijk centre.
const occupancyHeuristic = (hour: number, weekday: number, bays: number) => {
  // weekday: 0=Sun .. 6=Sat
  let load = 0.35;
  if (hour >= 10 && hour <= 13) load += 0.25;
  if (hour >= 16 && hour <= 18) load += 0.20;
  if (weekday === 6) load += 0.20; // Saturday
  if (weekday === 5) load += 0.10; // Friday
  if (weekday === 0) load -= 0.15; // Sunday quieter (most shops closed)
  if (hour < 8 || hour >= 20) load -= 0.30;
  // Smaller clusters fill faster
  if (bays <= 4) load += 0.05;
  if (bays >= 7) load -= 0.05;
  return Math.max(0, Math.min(1, load));
};

const rankSpots = (lat: number, lng: number, hour: number, weekday: number) =>
  SPOTS.map((s) => {
    const distance_m = distanceM(lat, lng, s.lat, s.lng);
    const occ = occupancyHeuristic(hour, weekday, s.bays);
    // Lower score is better: short walk + low occupancy.
    const score = distance_m / 1000 + occ * 0.6;
    const free_chance = Math.round((1 - occ) * 100);
    return { id: s.id, name: s.name, street: s.street, distance_m, free_chance, score };
  })
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const lat = typeof body.lat === "number" ? body.lat : 50.8267;
    const lng = typeof body.lng === "number" ? body.lng : 3.2647;
    const hour = typeof body.hour === "number" ? body.hour : new Date().getHours();
    const weekday = typeof body.weekday === "number" ? body.weekday : new Date().getDay();
    const question = typeof body.question === "string" ? body.question.slice(0, 500) : "";

    const top = rankSpots(lat, lng, hour, weekday);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // Graceful fallback — still return the heuristic ranking.
      return new Response(
        JSON.stringify({
          advice:
            "AI is tijdelijk niet beschikbaar. De top-suggesties zijn gebaseerd op afstand en typische drukte.",
          top_spots: top,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = [
      "Je bent een vriendelijke parkeer-assistent voor de stad Kortrijk.",
      "Je geeft KORT (max 3 zinnen) advies in het Nederlands over Shop&Go (gratis 30 min) parkeren.",
      "Belangrijk: er is geen officiële realtime bezetting beschikbaar — gebruik de meegegeven heuristiek.",
      "Eindig altijd met een herinnering dat de timer enkel persoonlijk is.",
    ].join(" ");

    const userMsg = [
      question ? `Vraag van de gebruiker: "${question}"` : "Geef advies om snel een Shop&Go-vak te vinden.",
      `Lokale tijd: uur=${hour}, weekdag=${weekday} (0=zon, 6=zat).`,
      `Gebruikerlocatie (lat,lng): ${lat.toFixed(4)}, ${lng.toFixed(4)}.`,
      `Top kandidaten (afstand in m, vrije kans %):`,
      ...top.map(
        (t, i) =>
          `${i + 1}. ${t.name} — ${t.distance_m} m — ${t.free_chance}% kans vrij`,
      ),
    ].join("\n");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (aiRes.status === 429) {
      return new Response(
        JSON.stringify({
          advice: "Te veel vragen — probeer over een minuutje opnieuw.",
          top_spots: top,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (aiRes.status === 402) {
      return new Response(
        JSON.stringify({
          advice:
            "AI-tegoed is op. Voeg credits toe in Settings → Workspace → Usage.",
          top_spots: top,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("AI gateway error", aiRes.status, text);
      return new Response(
        JSON.stringify({
          advice: "AI-advies kon niet worden geladen — toon enkel de ranking.",
          top_spots: top,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const json = await aiRes.json();
    const advice =
      json.choices?.[0]?.message?.content?.trim() ??
      "Geen advies beschikbaar op dit moment.";

    return new Response(
      JSON.stringify({ advice, top_spots: top }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("shopgo-assistant error", e);
    return new Response(
      JSON.stringify({
        advice: "Er ging iets mis bij het laden van AI-advies.",
        top_spots: [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
