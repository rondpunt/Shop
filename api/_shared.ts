import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const configuredOrigin = process.env.APP_ORIGIN || process.env.VERCEL_PROJECT_PRODUCTION_URL || "";

const getSupabaseAdmin = () => {
  if (!supabaseUrl || !serviceRoleKey) {
    throw Object.assign(new Error("Server configuration incomplete"), { statusCode: 503 });
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

let stripeClient: Stripe | null = null;
export const getStripeServer = () => {
  if (!stripeClient) {
    const key =
      process.env.STRIPE_SECRET_KEY ||
      process.env.STRIPE_LIVE_API_KEY ||
      process.env.STRIPE_SANDBOX_API_KEY;
    if (!key) throw Object.assign(new Error("Payments are not configured"), { statusCode: 503 });
    stripeClient = new Stripe(key);
  }
  return stripeClient;
};

export const readJsonBody = async (req: any) => {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    if (req.body.length > 100_000) {
      throw Object.assign(new Error("Request body too large"), { statusCode: 413 });
    }
    try {
      return JSON.parse(req.body);
    } catch {
      throw Object.assign(new Error("Invalid JSON"), { statusCode: 400 });
    }
  }
  return {};
};

export const requireUser = async (req: any) => {
  const header = String(req.headers?.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || token.length > 8_192) {
    throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  }
  const supabaseAdmin = getSupabaseAdmin();
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  return user;
};

export const getAdminClient = () => getSupabaseAdmin();

const normalizeOrigin = (value: string) => {
  if (!value) return "";
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return "";
  }
};

export const getRequestOrigin = (req: any) => {
  const forwardedHost = String(req.headers?.["x-forwarded-host"] || req.headers?.host || "").split(",")[0].trim();
  const forwardedProto = String(req.headers?.["x-forwarded-proto"] || "https").split(",")[0].trim();
  return forwardedHost ? `${forwardedProto}://${forwardedHost}` : "";
};

export const safeReturnUrl = (req: any, candidate: unknown, path = "/") => {
  const requestOrigin = normalizeOrigin(getRequestOrigin(req));
  const configured = normalizeOrigin(configuredOrigin);
  const allowedOrigins = new Set([requestOrigin, configured].filter(Boolean));

  if (typeof candidate === "string" && candidate.length <= 2_048) {
    try {
      const parsed = new URL(candidate);
      if (allowedOrigins.has(parsed.origin)) return parsed.toString();
    } catch {
      // ignore and fall back to a trusted origin below
    }
  }

  const base = requestOrigin || configured;
  if (!base) throw Object.assign(new Error("Trusted application origin is not configured"), { statusCode: 503 });
  return new URL(path, base).toString();
};

export const fail = (res: any, error: unknown) => {
  const e = error as any;
  const status = Number(e?.statusCode || 500);
  if (status >= 500) console.error(e);
  const publicMessage =
    status >= 500 ? "Interne serverfout" : String(e?.message || "Request failed");
  return res.status(status).json({ error: publicMessage });
};
