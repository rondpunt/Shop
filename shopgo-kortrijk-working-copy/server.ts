import express from "express";
import path from "path";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { clerkMiddleware, createClerkClient, getAuth } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./server/middlewares/clerkProxyMiddleware.js";

const PORT = Number(process.env.PORT) || 5000;

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

const LICENSE_PLATE_PATTERN = /\b(?:\d{1,2}-[A-Z]{3}-\d{1,3}|[A-Z]{3}-\d{3}|[A-Z0-9]{1,3}-[A-Z0-9]{1,4}-[A-Z0-9]{1,3})\b/gi;
const trimInput = (value: unknown, limit = 1_200) => String(value ?? "").trim().slice(0, limit);
const findSpotMention = (value: unknown) => {
  const normalized = trimInput(value).toLocaleLowerCase("nl-BE");
  return SHOPGO_SPOTS.find((spot) => normalized.includes(spot.name.toLocaleLowerCase("nl-BE"))) ?? null;
};
const extractPlate = (value: unknown) => trimInput(value).match(LICENSE_PLATE_PATTERN)?.[0] ?? null;
/** Keep precise locations and vehicle identifiers on the device, not in the external AI request. */
const redactForExternalAi = (value: unknown) => {
  let redacted = trimInput(value);
  for (const spot of SHOPGO_SPOTS) {
    redacted = redacted.replace(new RegExp(spot.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "[Shop&Go-locatie]");
  }
  return redacted
    .replace(LICENSE_PLATE_PATTERN, "[nummerplaat verborgen]")
    .replace(/\b(op|in|aan|bij)\s+[\p{L}\d'’ -]{2,60}(?=(?:,|\.|;|$|\bmet\b|\bwaar\b))/giu, "$1 [locatie verborgen]");
};

// Lazy-loaded GoogleGenAI Client
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  // Keep Clerk's production proxy ahead of any body parsing middleware.
  app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
  app.use(
    clerkMiddleware((req) => ({
      publishableKey: publishableKeyFromHost(
        getClerkProxyHost(req) ?? "",
        process.env.CLERK_PUBLISHABLE_KEY,
      ),
    })),
  );
  app.use((_, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", 'camera=(), microphone=(), payment=(self "https://checkout.stripe.com")');
    next();
  });
  app.use(express.json({ limit: "32kb" }));

  // API Endpoints
  app.get("/api/parko-states", async (req, res) => {
    try {
      const PARKO_URL = "https://shop.parko.be/m/restv1/parkodata/ShopAndGoStates";
      const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "");
      const normaliseState = (s: string) => {
        const v = s.toLowerCase();
        if (v === "free") return "free";
        if (v === "occupied") return "occupied";
        return "unknown";
      };
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8_000);
      let response: Response;
      try {
        response = await fetch(PARKO_URL, {
          headers: { Accept: "application/json", "User-Agent": "shopgo-kortrijk/1.0" },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
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
      // Simple Cache-Control to avoid spamming the endpoint
      res.setHeader("Cache-Control", "public, max-age=20");
      res.json(payload);
    } catch (error: any) {
      console.error("Parko API Error:", error);
      res.status(502).json({ error: error.message || "Interne serverfout" });
    }
  });

  app.get("/api/shopgo-spots", async (req, res) => {
    try {
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
    } catch (error: any) {
      console.error("Spots API Error:", error);
      res.status(502).json({ error: error.message || "Interne serverfout" });
    }
  });

  



// Initialize Stripe (lazy initialization, only fail if actually used without key)
let stripeClient: Stripe | null = null;
function getStripeServer(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_LIVE_API_KEY || process.env.STRIPE_SANDBOX_API_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY environment variable is required for payments");
    }
    stripeClient = new Stripe(key, { apiVersion: "2024-04-10" });
  }
  return stripeClient;
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "placeholder-key";
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

// Only payment routes need a Supabase client. Creating it at server startup
// initializes Supabase Realtime, which is unavailable in this Node 20 runtime.
function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseAdmin;
}

type ClerkIdentity = {
  clerkUserId: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
};

async function getClerkIdentity(req: express.Request): Promise<ClerkIdentity> {
  const auth = getAuth(req);
  if (!auth.userId) throw new Error("Unauthorized");
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const user = await clerk.users.getUser(auth.userId);
  const email = user.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
  if (!email) throw new Error("Een geverifieerd e-mailadres is vereist");

  return {
    clerkUserId: user.id,
    email,
    displayName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || null,
    avatarUrl: user.imageUrl || null,
  };
}

/**
 * Clerk owns the user-facing session. Supabase continues to hold the existing
 * parking data, so this creates or securely links an internal Supabase account
 * and returns a single-use magic-link hash for the browser's existing client.
 */
async function bridgeClerkToSupabase(req: express.Request) {
  const identity = await getClerkIdentity(req);
  const admin = getSupabaseAdmin();
  const clerkProvider = `clerk:${identity.clerkUserId}`;

  const { data: linkedProfile, error: linkedProfileError } = await admin
    .from("profiles")
    .select("id")
    .eq("provider", clerkProvider)
    .maybeSingle();
  if (linkedProfileError) throw linkedProfileError;

  let supabaseUserId = linkedProfile?.id ?? null;
  if (!supabaseUserId) {
    const { data: emailProfile, error: emailProfileError } = await admin
      .from("profiles")
      .select("id")
      .eq("email", identity.email)
      .maybeSingle();
    if (emailProfileError) throw emailProfileError;
    supabaseUserId = emailProfile?.id ?? null;
  }

  if (!supabaseUserId) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: identity.email,
      email_confirm: true,
      user_metadata: { clerk_user_id: identity.clerkUserId },
    });
    if (createError || !created.user) throw createError ?? new Error("Account kon niet worden aangemaakt");
    supabaseUserId = created.user.id;
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: supabaseUserId,
    email: identity.email,
    display_name: identity.displayName,
    avatar_url: identity.avatarUrl,
    provider: clerkProvider,
  });
  if (profileError) throw profileError;

  const { data: magicLink, error: magicLinkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: identity.email,
  });
  if (magicLinkError || !magicLink?.properties?.hashed_token) {
    throw magicLinkError ?? new Error("Account-sessie kon niet worden voorbereid");
  }

  return { tokenHash: magicLink.properties.hashed_token };
}

const safeLocalReturnUrl = (req: express.Request, candidate: unknown) => {
  const origin = `${req.protocol}://${req.get("host")}`;
  if (typeof candidate !== "string" || candidate.length > 2_048) return new URL("/", origin).toString();
  try {
    const parsed = new URL(candidate);
    if (parsed.origin === origin) return parsed.toString();
  } catch {
    // Return a safe first-party URL below.
  }
  return new URL("/", origin).toString();
};

app.post("/api/auth/bootstrap", async (req, res) => {
  try {
    const { tokenHash } = await bridgeClerkToSupabase(req);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ tokenHash });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : "Account kon niet worden voorbereid";
    const status = message === "Unauthorized" ? 401 : 500;
    console.error("Clerk account bridge failed:", {
      message,
      code: error?.code,
      name: error?.name,
      details: error?.details,
    });
    return res.status(status).json({ error: status === 401 ? "Unauthorized" : message });
  }
});

app.post("/api/checkout", async (req, res) => {
  try {
    const { priceId, returnUrl, environment } = req.body;
    if (!priceId || !returnUrl) return res.status(400).json({ error: "Missing parameters" });

    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const { data: { user }, error: authErr } = await getSupabaseAdmin().auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: "Unauthorized" });

    const stripe = getStripeServer();
    const prices = await stripe.prices.list({ lookup_keys: [priceId] });
    if (!prices.data.length) return res.status(404).json({ error: "Price not found" });

    const stripePrice = prices.data[0];
    const isRecurring = stripePrice.type === "recurring";

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded_page",
      return_url: safeLocalReturnUrl(req, returnUrl),
      customer_email: user.email,
      metadata: { userId: user.id },
      ...(isRecurring && {
        subscription_data: { metadata: { userId: user.id } },
      }),
    });

    res.json({ clientSecret: session.client_secret });
  } catch (err: any) {
    console.error("Checkout error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

app.post("/api/customer-portal", async (req, res) => {
  try {
    const { returnUrl } = req.body;
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const { data: { user }, error: authErr } = await getSupabaseAdmin().auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: "Unauthorized" });

    const stripe = getStripeServer();
    
    // We need to find the stripe customer ID for this user.
    // Ideally this is stored in a 'profiles' table or similar.
    // For now, we will search Stripe customers by email.
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (!customers.data.length) return res.status(404).json({ error: "Customer not found in Stripe" });

    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: safeLocalReturnUrl(req, returnUrl),
    });

    res.json({ url: session.url });
  } catch (err: any) {
    console.error("Portal error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});


  
app.post("/api/check-subscription", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const { data: { user }, error: authErr } = await getSupabaseAdmin().auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: "Unauthorized" });

    const stripe = getStripeServer();
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (!customers.data.length) return res.json({ status: "none" });

    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: "all",
      limit: 1,
      expand: ["data.default_payment_method"]
    });
    
    if (!subscriptions.data.length) return res.json({ status: "none" });
    
    const sub = subscriptions.data[0];
    
    // Upsert subscription into Supabase
    await getSupabaseAdmin()
      .from("subscriptions")
      .upsert({
        user_id: user.id,
        environment: req.body.environment || "live",
        status: sub.status,
        price_id: sub.items.data[0].price.id,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        cancel_at_period_end: sub.cancel_at_period_end,
      }, { onConflict: "user_id, environment" });

    res.json({ status: sub.status });
  } catch (err: any) {
    console.error("Check sub error:", err);
    res.status(500).json({ error: err.message });
  }
});

  app.post("/api/gemini/assistant", async (req, res) => {
    try {
      const ai = getAiClient();
      const { mode, text, history } = req.body;
      const rawText = trimInput(text);
      if (!rawText) return res.status(400).json({ success: false, error: "Vraag ontbreekt" });
      const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
      if (!token || token.length > 8_192) return res.status(401).json({ success: false, error: "Unauthorized" });
      const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token);
      if (authError || !user) return res.status(401).json({ success: false, error: "Unauthorized" });
      const mentionedSpot = findSpotMention(rawText);
      const localPlate = extractPlate(rawText);
      const safeText = redactForExternalAi(rawText);

      if (mode === "parse") {
        // AI Smart Start: Parse parking description into structured fields
        const systemInstruction = `
          You are an expert parking parsing engine for the "Shop & Go Kortrijk" application.
          Your task is to parse a user's free-form description of where they are parked in Kortrijk and extract structured data.
          You MUST match the described street or area against this list of valid Shop & Go locations:
          ${JSON.stringify(SHOPGO_SPOTS)}

          Rules for extraction:
          1. Extract 'matchedCarDescription': e.g., "rode Golf", "zilveren BMW", if described. If not mentioned, return null.
           2. Write a friendly, polite explanation in Dutch. Confirm the matched location and explain that official Parko sensors report availability. Offer to start the user's reminder timer.
          
          You must respond in strict JSON format matching the schema requested.
        `;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Gebruikersbeschrijving zonder exacte locatie of nummerplaat: "${safeText}"`,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                matchedCarDescription: { type: Type.STRING, description: "Color/model of car" },
                explanation: { type: Type.STRING, description: "Polite confirmation/explanation in Dutch" }
              },
              required: ["matchedCarDescription", "explanation"]
            }
          }
        });

        const parsedResult = JSON.parse(response.text || "{}");
        res.json({
          success: true,
          data: {
            ...parsedResult,
            matchedStreet: mentionedSpot?.name ?? null,
            matchedZoneId: mentionedSpot?.id ?? null,
            matchedPlate: localPlate,
          },
        });

      } else {
        // Chatbot Mode: Friendly Q&A about Shop & Go rules & advice
        const systemInstruction = `
          Je bent de vriendelijke "AI Parkeerassistent" voor de "Shop & Go Kortrijk" mobiele app.
          Je helpt automobilisten in Kortrijk met alle vragen rond de Shop & Go parkeerplaatsen.

          Belangrijke feiten over Shop & Go in Kortrijk die je MOET gebruiken:
           - De app toont officiële Parko-sensordata over vrije plaatsen.
           - Sensoren in het wegdek rapporteren bezette en vrije plaatsen; beschikbaarheid kan wijzigen.
           - Gebruik uitsluitend de actuele sensordata in de app en verwijs voor lokale regels naar officiële borden ter plaatse.

          Lijst van Shop & Go locaties in Kortrijk ter referentie:
          ${JSON.stringify(SHOPGO_SPOTS.map(s => `${s.name} (${s.street}, max ${s.bays} plaatsen)`).join(", "))}

          Richtlijnen voor je antwoorden:
          - Wees behulpzaam, positief en professioneel.
          - Antwoord ALTIJD in het Nederlands.
          - Houd je antwoorden kort, bondig en geoptimaliseerd voor een mobiel scherm (geen enorme lappen tekst, gebruik waar nodig bullet points).
          - Als de gebruiker vraagt waar hij kan parkeren, geef dan concrete suggesties uit de lijst van locaties.
        `;

        // Format history for Gemini chat if present, otherwise do a simple call
        let contents: any[] = [];
        if (history && Array.isArray(history)) {
          contents = history.map((h: any) => ({
            role: h.role === "assistant" ? "model" : "user",
            parts: [{ text: redactForExternalAi(h.content) }]
          }));
        }
        contents.push({ role: "user", parts: [{ text: safeText }] });

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents,
          config: {
            systemInstruction
          }
        });

        res.json({ success: true, text: response.text });
      }
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ success: false, error: error.message || "Interne serverfout" });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
