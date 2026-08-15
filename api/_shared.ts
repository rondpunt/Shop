import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl) console.warn("VITE_SUPABASE_URL/SUPABASE_URL is not configured");
if (!serviceRoleKey) console.warn("SUPABASE_SERVICE_ROLE_KEY is not configured");

export const supabaseAdmin = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  serviceRoleKey || "placeholder-service-role",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

let stripeClient: Stripe | null = null;
export const getStripeServer = () => {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_LIVE_API_KEY || process.env.STRIPE_SANDBOX_API_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
    stripeClient = new Stripe(key);
  }
  return stripeClient;
};

export const readJsonBody = async (req: any) => {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
};

export const requireUser = async (req: any) => {
  const header = String(req.headers?.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  return user;
};

export const fail = (res: any, error: unknown) => {
  const e = error as any;
  const status = Number(e?.statusCode || 500);
  if (status >= 500) console.error(e);
  return res.status(status).json({ error: e?.message || "Internal server error" });
};
