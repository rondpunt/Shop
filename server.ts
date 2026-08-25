import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import {
  fail,
  findStripeCustomerForUser,
  getAdminClient,
  getStripeServer,
  readJsonBody,
  requireUser,
  safeReturnUrl,
} from "./api/_shared";

// Bind to the platform-provided port (Render/Fly/Heroku set $PORT); fall back to 3000 for local dev.
const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Only these Stripe lookup keys may be purchased. Prevents arbitrary/price-shopping checkout sessions.
const ALLOWED_LOOKUP_KEYS = new Set(["premium_monthly", "premium_yearly"]);

// Bound all free-form user text before it reaches the AI provider to limit abuse and cost.
const cleanText = (value: unknown, max = 1200) => String(value ?? "").trim().slice(0, max);

// Curated Shop & Go spots in Kortrijk for Gemini matching
const SHOPGO_SPOTS = [
  { id: "grote-markt", name: "Grote Markt", street: "Grote Markt", bays: 8 },
  { id: "leiestraat", name: "Leiestraat", street: "Leiestraat", bays: 6 },
  { id: "korte-steenstraat", name: "Korte Steenstraat", street: "Korte Steenstraat", bays: 4 },
  { id: "lange-steenstraat", name: "Lange Steenstraat", street: "Lange Steenstraat", bays: 5 },
  { id: "doorniksestraat", name: "Doorniksestraat", street: "Doorniksestraat", bays: 7 },
  { id: "doorniksewijk", name: "Doorniksewijk", street: "Doorniksewijk", bays: 6 },
  { id: "rijselsestraat", name: "Rijselsestraat", street: "Rijselsestraat", bays: 5 },
  { id: "budastraat", name: "Budastraat", street: "Budastraat", bays: 4 },
  { id: "voorstraat", name: "Voorstraat", street: "Voorstraat", bays: 4 },
  { id: "graanmarkt", name: "Graanmarkt", street: "Graanmarkt", bays: 6 },
  { id: "vlasmarkt", name: "Vlasmarkt", street: "Vlasmarkt", bays: 5 },
  { id: "houtmarkt", name: "Houtmarkt", street: "Houtmarkt", bays: 5 },
  { id: "sint-maartenskerkhof", name: "Sint-Maartenskerkhof", street: "Sint-Maartenskerkhof", bays: 3 },
  { id: "schouwburgplein", name: "Schouwburgplein", street: "Schouwburgplein", bays: 4 },
  { id: "veemarkt", name: "Veemarkt", street: "Veemarkt", bays: 6 },
  { id: "overbekeplein", name: "Overbekeplein", street: "Overbekeplein", bays: 4 },
  { id: "wandelingstraat", name: "Wandelingstraat", street: "Wandelingstraat", bays: 4 },
  { id: "noordstraat", name: "Noordstraat", street: "Noordstraat", bays: 5 },
  { id: "zwevegemsestraat", name: "Zwevegemsestraat", street: "Zwevegemsestraat", bays: 5 },
  { id: "burgemeester-reynaertstraat", name: "Burgemeester Reynaertstraat", street: "Burgemeester Reynaertstraat", bays: 4 },
  { id: "groeningestraat", name: "Groeningestraat", street: "Groeningestraat", bays: 4 },
  { id: "magdalenastraat", name: "Magdalenastraat", street: "Magdalenastraat", bays: 3 },
  { id: "sint-jansstraat", name: "Sint-Jansstraat", street: "Sint-Jansstraat", bays: 3 },
  { id: "onze-lieve-vrouwestraat", name: "Onze-Lieve-Vrouwestraat", street: "Onze-Lieve-Vrouwestraat", bays: 4 },
  { id: "lekkerbeetstraat", name: "Lekkerbeetstraat", street: "Lekkerbeetstraat", bays: 3 },
  { id: "sint-amandsplein", name: "Sint-Amandsplein", street: "Sint-Amandsplein", bays: 4 }
];

// Lazy-loaded GoogleGenAI Client. Fails closed (503) when the API key is absent.
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw Object.assign(new Error("AI is tijdelijk niet beschikbaar"), { statusCode: 503 });
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });
  }
  return aiClient;
}

// Security headers applied to every response. When self-hosted (Express) the Vercel `headers`
// config in vercel.json does not run, so we mirror it here to keep the deployed posture identical.
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://checkout.stripe.com",
  "script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com https://js.stripe.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://maps.googleapis.com https://maps.gstatic.com https://*.googleapis.com https://*.ggpht.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // In development the app may talk to a local Supabase stack (npx supabase start) on
  // 127.0.0.1:54321 over http/ws. Those local origins are added only when NODE_ENV !== production.
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com https://*.googleapis.com https://api.stripe.com https://r.stripe.com${
    IS_PRODUCTION ? "" : " http://127.0.0.1:54321 http://localhost:54321 ws://127.0.0.1:54321 ws://localhost:54321"
  }`,
  "frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

function applySecurityHeaders(req: express.Request, res: express.Response, next: express.NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(self), geolocation=(self), microphone=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");

  // Only force HTTPS upgrades when the request is actually served over TLS, so local http dev keeps working.
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const isHttps = forwardedProto === "https" || (req as any).secure === true;
  res.setHeader(
    "Content-Security-Policy",
    isHttps ? `${CSP_DIRECTIVES}; upgrade-insecure-requests` : CSP_DIRECTIVES,
  );

  // Default API responses to non-cacheable; individual public endpoints may relax this afterwards.
  if (req.path.startsWith("/api/")) res.setHeader("Cache-Control", "no-store");
  next();
}

async function startServer() {
  const app = express();
  app.disable("x-powered-by");
  app.use(applySecurityHeaders);

  // Dev-only same-origin proxy to a local Supabase stack. Opt-in via DEV_SUPABASE_PROXY_TARGET
  // (e.g. http://127.0.0.1:54321) and only active outside production. It lets the browser reach
  // Supabase through the app origin (VITE_SUPABASE_URL=http://localhost:3000/sb), avoiding
  // cross-origin/mixed-content/CSP issues during local development. Inert in production.
  const devSupabaseTarget = process.env.DEV_SUPABASE_PROXY_TARGET;
  if (!IS_PRODUCTION && devSupabaseTarget) {
    const target = devSupabaseTarget.replace(/\/$/, "");
    // Registered before express.json so the raw upstream body is preserved.
    app.use("/sb", async (req, res) => {
      try {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const rawBody = chunks.length ? Buffer.concat(chunks) : undefined;
        const upstreamUrl = target + req.originalUrl.replace(/^\/sb/, "");
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(req.headers)) {
          if (typeof v === "string" && !["host", "content-length", "connection"].includes(k.toLowerCase())) {
            headers[k] = v;
          }
        }
        const method = req.method.toUpperCase();
        const upstream = await fetch(upstreamUrl, {
          method,
          headers,
          body: method === "GET" || method === "HEAD" ? undefined : rawBody,
          redirect: "manual",
        });
        res.status(upstream.status);
        upstream.headers.forEach((value, key) => {
          if (!["content-encoding", "transfer-encoding", "content-length"].includes(key.toLowerCase())) {
            res.setHeader(key, value);
          }
        });
        res.send(Buffer.from(await upstream.arrayBuffer()));
      } catch (err) {
        console.error("Supabase dev proxy error:", err);
        res.status(502).json({ error: "Supabase proxy error" });
      }
    });
  }

  // Cap request bodies to blunt trivial memory-exhaustion attempts.
  app.use(express.json({ limit: "100kb" }));

  // ---- Public endpoints (no secrets, safe to serve unauthenticated) ----

  app.get("/api/parko-states", async (_req, res) => {
    try {
      const PARKO_URL = "https://shop.parko.be/m/restv1/parkodata/ShopAndGoStates";
      const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "");
      const normaliseState = (s: string) => {
        const v = s.toLowerCase();
        if (v === "free") return "free";
        if (v === "occupied") return "occupied";
        return "unknown";
      };
      const response = await fetch(PARKO_URL, {
        headers: { Accept: "application/json", "User-Agent": "shopgo-kortrijk/1.0" },
      });
      if (!response.ok) throw new Error(`Parko upstream ${response.status}`);
      const data = await response.json();

      const zoneMap = new Map<string, any>();
      for (const z of data) {
        const key = `${z.municipality}-${slug(z.name)}`;
        const bays = (z.sensors ?? []).map((s: any) => ({
          id: s.parkingBay,
          lat: s.latitude,
          lng: s.longitude,
          state: normaliseState(s.state),
        }));
        const freeBays = bays.filter((b: any) => b.state === "free").length;
        const occupiedBays = bays.filter((b: any) => b.state === "occupied").length;
        const unknownBays = bays.filter((b: any) => b.state === "unknown").length;

        if (zoneMap.has(key)) {
          const existing = zoneMap.get(key);
          existing.totalBays += bays.length;
          existing.freeBays += freeBays;
          existing.occupiedBays += occupiedBays;
          existing.unknownBays += unknownBays;
          existing.bays.push(...bays);
        } else {
          zoneMap.set(key, {
            id: key,
            name: z.name,
            municipality: z.municipality,
            lat: z.latitude,
            lng: z.longitude,
            totalBays: bays.length,
            freeBays,
            occupiedBays,
            unknownBays,
            bays,
          });
        }
      }
      const zones = Array.from(zoneMap.values());
      const payload = {
        fetchedAt: new Date().toISOString(),
        zones,
        totalFree: zones.reduce((a: number, z: any) => a + z.freeBays, 0),
        totalBays: zones.reduce((a: number, z: any) => a + z.totalBays, 0),
      };
      res.setHeader("Cache-Control", "public, max-age=20");
      res.json(payload);
    } catch (error: any) {
      console.error("Parko API Error:", error);
      res.status(502).json({ error: "Interne serverfout" });
    }
  });

  app.get("/api/shopgo-spots", async (_req, res) => {
    const SPOTS = [
      { id: "grote-markt",            name: "Grote Markt",            street: "Grote Markt",                  lat: 50.8275, lng: 3.2647, bays: 8, verification: "manual" },
      { id: "leiestraat",             name: "Leiestraat",             street: "Leiestraat",                   lat: 50.8268, lng: 3.2632, bays: 6, verification: "manual" },
      { id: "korte-steenstraat",      name: "Korte Steenstraat",      street: "Korte Steenstraat",            lat: 50.8262, lng: 3.2638, bays: 4, verification: "manual" },
      { id: "lange-steenstraat",      name: "Lange Steenstraat",      street: "Lange Steenstraat",            lat: 50.8255, lng: 3.2630, bays: 5, verification: "manual" },
      { id: "doorniksestraat",        name: "Doorniksestraat",        street: "Doorniksestraat",              lat: 50.8240, lng: 3.2660, bays: 7, verification: "manual" },
      { id: "doorniksewijk",          name: "Doorniksewijk",          street: "Doorniksewijk",                lat: 50.8215, lng: 3.2685, bays: 6, verification: "manual" },
      { id: "rijselsestraat",         name: "Rijselsestraat",         street: "Rijselsestraat",               lat: 50.8248, lng: 3.2608, bays: 5, verification: "manual" },
      { id: "budastraat",             name: "Budastraat",             street: "Budastraat",                   lat: 50.8290, lng: 3.2635, bays: 4, verification: "unverified" },
      { id: "voorstraat",             name: "Voorstraat",             street: "Voorstraat",                   lat: 50.8285, lng: 3.2670, bays: 4, verification: "unverified" },
      { id: "graanmarkt",             name: "Graanmarkt",             street: "Graanmarkt",                   lat: 50.8278, lng: 3.2660, bays: 6, verification: "manual" },
      { id: "vlasmarkt",              name: "Vlasmarkt",              street: "Vlasmarkt",                    lat: 50.8272, lng: 3.2655, bays: 5, verification: "manual" },
      { id: "houtmarkt",              name: "Houtmarkt",              street: "Houtmarkt",                    lat: 50.8258, lng: 3.2655, bays: 5, verification: "manual" },
      { id: "sint-maartenskerkhof",   name: "Sint-Maartenskerkhof",   street: "Sint-Maartenskerkhof",         lat: 50.8270, lng: 3.2670, bays: 3, verification: "unverified" },
      { id: "schouwburgplein",        name: "Schouwburgplein",        street: "Schouwburgplein",              lat: 50.8252, lng: 3.2670, bays: 4, verification: "manual" },
      { id: "veemarkt",               name: "Veemarkt",               street: "Veemarkt",                     lat: 50.8298, lng: 3.2650, bays: 6, verification: "manual" },
      { id: "overbekeplein",          name: "Overbekeplein",          street: "Overbekeplein",                lat: 50.8235, lng: 3.2690, bays: 4, verification: "unverified" },
      { id: "wandelingstraat",        name: "Wandelingstraat",        street: "Wandelingstraat",              lat: 50.8225, lng: 3.2645, bays: 4, verification: "unverified" },
      { id: "noordstraat",            name: "Noordstraat",            street: "Noordstraat",                  lat: 50.8265, lng: 3.2615, bays: 5, verification: "manual" },
      { id: "zwevegemsestraat",       name: "Zwevegemsestraat",       street: "Zwevegemsestraat",             lat: 50.8285, lng: 3.2705, bays: 5, verification: "unverified" },
      { id: "burgemeester-reynaert",  name: "Reynaertstraat",         street: "Burgemeester Reynaertstraat",  lat: 50.8295, lng: 3.2680, bays: 4, verification: "unverified" },
      { id: "groeningestraat",        name: "Groeningestraat",        street: "Groeningestraat",              lat: 50.8232, lng: 3.2670, bays: 4, verification: "manual" },
      { id: "magdalenastraat",        name: "Magdalenastraat",        street: "Magdalenastraat",              lat: 50.8268, lng: 3.2685, bays: 3, verification: "unverified" },
      { id: "sint-jansstraat",        name: "Sint-Jansstraat",        street: "Sint-Jansstraat",              lat: 50.8262, lng: 3.2622, bays: 3, verification: "unverified" },
      { id: "olv-straat",             name: "O.L.V.-straat",          street: "Onze-Lieve-Vrouwestraat",      lat: 50.8285, lng: 3.2645, bays: 4, verification: "manual" },
      { id: "lekkerbeetstraat",       name: "Lekkerbeetstraat",       street: "Lekkerbeetstraat",             lat: 50.8280, lng: 3.2625, bays: 3, verification: "unverified" },
      { id: "sint-amandsplein",       name: "Sint-Amandsplein",       street: "Sint-Amandsplein",             lat: 50.8278, lng: 3.2680, bays: 4, verification: "manual" },
    ];
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json({
      spots: SPOTS,
      count: SPOTS.length,
      updated_at: new Date().toISOString(),
      disclaimer: "Voorlopige lijst — geen officiële realtime bron. Controleer altijd de borden ter plaatse.",
    });
  });

  // ---- Authenticated payment endpoints (mirror the hardened Vercel functions in /api) ----

  app.post("/api/checkout", async (req, res) => {
    try {
      const user = await requireUser(req);
      const { priceId, returnUrl } = await readJsonBody(req);
      const lookupKey = String(priceId || "");
      if (!ALLOWED_LOOKUP_KEYS.has(lookupKey)) {
        return res.status(400).json({ error: "Ongeldig abonnement" });
      }

      const safeReturn = safeReturnUrl(
        req,
        returnUrl,
        "/premium?checkout=success&session_id={CHECKOUT_SESSION_ID}",
      );

      const stripe = getStripeServer();
      const prices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
      const price = prices.data[0];
      if (!price) return res.status(404).json({ error: "Prijs niet gevonden" });

      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { shopgoUserId: user.id },
      });
      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        mode: price.type === "recurring" ? "subscription" : "payment",
        ui_mode: "embedded",
        return_url: safeReturn,
        customer: customer.id,
        client_reference_id: user.id,
        metadata: { userId: user.id },
        ...(price.type === "recurring"
          ? { subscription_data: { metadata: { userId: user.id } } }
          : {}),
      });

      if (!session.client_secret) throw new Error("Checkout kon niet worden gestart");
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ clientSecret: session.client_secret });
    } catch (error) {
      return fail(res, error);
    }
  });

  app.post("/api/customer-portal", async (req, res) => {
    try {
      const user = await requireUser(req);
      const { returnUrl } = await readJsonBody(req);
      if (!user.email) return res.status(400).json({ error: "Account heeft geen e-mailadres" });

      const stripe = getStripeServer();
      const customer = await findStripeCustomerForUser(stripe, user);
      if (!customer) return res.status(404).json({ error: "Geen abonnementsklant gevonden" });

      const session = await stripe.billingPortal.sessions.create({
        customer: customer.id,
        return_url: safeReturnUrl(req, returnUrl, "/premium"),
      });
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ url: session.url });
    } catch (error) {
      return fail(res, error);
    }
  });

  app.post("/api/check-subscription", async (req, res) => {
    try {
      const user = await requireUser(req);
      const { environment = "live" } = await readJsonBody(req);
      const env = environment === "sandbox" ? "sandbox" : "live";
      if (!user.email) return res.status(200).json({ status: "none" });

      const stripe = getStripeServer();
      const customer = await findStripeCustomerForUser(stripe, user);
      if (!customer) return res.status(200).json({ status: "none" });

      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "all",
        limit: 10,
      });
      const sub = subscriptions.data.sort(
        (a: any, b: any) => Number(b.created || 0) - Number(a.created || 0),
      )[0];
      if (!sub) return res.status(200).json({ status: "none" });

      const row = {
        user_id: user.id,
        environment: env,
        stripe_customer_id: customer.id,
        stripe_subscription_id: sub.id,
        status: sub.status,
        price_id: sub.items.data[0]?.price?.id ?? null,
        product_id:
          typeof sub.items.data[0]?.price?.product === "string"
            ? sub.items.data[0].price.product
            : null,
        current_period_end: (sub as any).items.data[0]?.current_period_end
          ? new Date((sub as any).items.data[0].current_period_end * 1000).toISOString()
          : null,
        cancel_at_period_end: sub.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      };

      const supabaseAdmin = getAdminClient();
      const { data: existing } = await supabaseAdmin
        .from("subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("environment", env)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        await supabaseAdmin.from("subscriptions").update(row).eq("id", existing.id);
      } else {
        await supabaseAdmin.from("subscriptions").insert(row);
      }

      return res.status(200).json({
        status: sub.status,
        current_period_end: row.current_period_end,
        cancel_at_period_end: row.cancel_at_period_end,
      });
    } catch (error) {
      return fail(res, error);
    }
  });

  // ---- Authenticated AI assistant (requires a valid Supabase session; bounded input) ----

  app.post("/api/gemini/assistant", async (req, res) => {
    try {
      await requireUser(req);
      const ai = getAiClient();
      const body = await readJsonBody(req);
      const mode = body?.mode === "parse" ? "parse" : "chat";
      const text = cleanText(body?.text);
      if (!text) return res.status(400).json({ success: false, error: "Vraag ontbreekt" });

      if (mode === "parse") {
        const systemInstruction = `
          You are an expert parking parsing engine for the "Shop & Go Kortrijk" application.
          Your task is to parse a user's free-form description of where they are parked in Kortrijk and extract structured data.
          You MUST match the described street or area against this list of valid Shop & Go locations:
          ${JSON.stringify(SHOPGO_SPOTS)}

          Rules for extraction:
          1. Extract 'matchedStreet': the actual street name mentioned.
          2. Extract 'matchedZoneId': the exact ID from the locations list above that best matches the described parking location. If no match is close, return null.
          3. Extract 'matchedCarDescription': e.g., "rode Golf", "zilveren BMW", if described. If not mentioned, return null.
          4. Extract 'matchedPlate': any license plate sequence (like "1-ABC-123" or similar Belgian plates) if mentioned. If not, return null.
          5. Write a friendly, polite explanation in Dutch. Advise that Shop&Go has 30 minutes of free parking and a sensor is tracking them. Offer to start their timer.

          You must respond in strict JSON format matching the schema requested.
        `;

        const response = await ai.models.generateContent({
          model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
          contents: `User description: "${text}"`,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                matchedStreet: { type: Type.STRING, description: "Extracted street name" },
                matchedZoneId: { type: Type.STRING, description: "Best matched location ID from the SHOPGO_SPOTS list" },
                matchedCarDescription: { type: Type.STRING, description: "Color/model of car" },
                matchedPlate: { type: Type.STRING, description: "License plate number" },
                explanation: { type: Type.STRING, description: "Polite confirmation/explanation in Dutch" }
              },
              required: ["matchedStreet", "matchedZoneId", "matchedCarDescription", "matchedPlate", "explanation"]
            }
          }
        });

        res.setHeader("Cache-Control", "no-store");
        return res.json({ success: true, data: JSON.parse(response.text || "{}") });
      }

      const systemInstruction = `
        Je bent de vriendelijke "AI Parkeerassistent" voor de "Shop & Go Kortrijk" mobiele app.
        Je helpt automobilisten in Kortrijk met alle vragen rond de Shop & Go parkeerplaatsen.

        Belangrijke feiten over Shop & Go in Kortrijk die je MOET gebruiken:
        - Maximum parkeertijd: Precies 30 minuten.
        - Tarief: 100% gratis! Er is geen ticket of blauwe parkeerschijf nodig.
        - Actieve uren: Maandag t.m. zaterdag van 9:00 tot 19:00 uur. Buiten deze uren, op zondag en op feestdagen is het parkeren vrij en onbeperkt.
        - Hoe het werkt: Een draadloze sensor (magnetometer) in het wegdek detecteert wanneer je auto aankomt. Een timer telt 30 minuten af.
        - Boete (Retributie): Bij overschrijding van de 30 minuten stuurt de sensor automatisch een melding naar de Parko parkeerwachters. Zij schrijven een retributie (boete) uit van €30 per halve dag.
        - Minder mobielen: Een blauwe kaart voor mindervalligen geeft GEEN uitzondering op de 30 minuten limiet op Shop&Go sensorgebonden plekken in Kortrijk. Dit is om een hoge rotatie voor iedereen te garanderen.
        - Doel: Hoge rotatie van parkeerplaatsen bevorderen zodat klanten snel een lokale winkel, apotheek, bakkerij of bank kunnen bezoeken. Dit helpt de Kortrijkse handelaars!

        Lijst van Shop & Go locaties in Kortrijk ter referentie:
        ${JSON.stringify(SHOPGO_SPOTS.map(s => `${s.name} (${s.street}, max ${s.bays} plaatsen)`).join(", "))}

        Richtlijnen voor je antwoorden:
        - Wees behulpzaam, positief en professioneel.
        - Antwoord ALTIJD in het Nederlands.
        - Houd je antwoorden kort, bondig en geoptimaliseerd voor een mobiel scherm (geen enorme lappen tekst, gebruik waar nodig bullet points).
        - Als de gebruiker vraagt waar hij kan parkeren, geef dan concrete suggesties uit de lijst van locaties.
      `;

      const history = Array.isArray(body?.history) ? body.history.slice(-10) : [];
      const contents = history
        .map((h: any) => ({
          role: h?.role === "assistant" ? "model" : "user",
          parts: [{ text: cleanText(h?.content, 900) }],
        }))
        .filter((item: any) => item.parts[0].text.length > 0);
      contents.push({ role: "user", parts: [{ text }] });

      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
        contents,
        config: { systemInstruction },
      });

      res.setHeader("Cache-Control", "no-store");
      return res.json({ success: true, text: response.text });
    } catch (error) {
      const e = error as any;
      const status = Number(e?.statusCode || 500);
      if (status >= 500) console.error("Gemini API Error:", e);
      const publicMessage = status >= 500 ? "Interne serverfout" : String(e?.message || "Request failed");
      return res.status(status).json({ success: false, error: publicMessage });
    }
  });

  // ---- Frontend: Vite middleware in dev, static build in production ----
  if (!IS_PRODUCTION) {
    // Import Vite lazily so production runtimes never need the dev toolchain.
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT} (${IS_PRODUCTION ? "production" : "development"})`);
  });
}

startServer();
