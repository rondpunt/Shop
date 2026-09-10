import { getAdminClient, isSupabaseAdminConfigured } from "./_shared.js";

const DEFAULT_SPOTS_MAX_HITS = 60;
const DEFAULT_SPOTS_WINDOW_SECONDS = 60;

export const getClientIp = (req: {
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}): string | null => {
  const forwarded = String(req.headers?.["x-forwarded-for"] || req.headers?.["x-real-ip"] || "")
    .split(",")[0]
    .trim();
  const candidate = forwarded || req.socket?.remoteAddress || "";
  if (!candidate || candidate.length > 128) return null;
  return candidate;
};

const spotsRateLimitConfig = () => {
  const maxHits = Number(process.env.SPOTS_RATE_LIMIT_MAX || DEFAULT_SPOTS_MAX_HITS);
  const windowSeconds = Number(process.env.SPOTS_RATE_LIMIT_WINDOW_SEC || DEFAULT_SPOTS_WINDOW_SECONDS);
  if (!Number.isFinite(maxHits) || maxHits <= 0 || !Number.isFinite(windowSeconds) || windowSeconds <= 0) {
    return null;
  }
  return { maxHits, windowSeconds };
};

/** Fail-closed when Supabase is configured; skipped when admin credentials are absent. */
export const enforceSpotsIpRateLimit = async (req: {
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}) => {
  if (!isSupabaseAdminConfigured()) {
    return;
  }

  const ip = getClientIp(req);
  if (!ip) {
    throw Object.assign(new Error("Could not determine client IP"), { statusCode: 503 });
  }

  const config = spotsRateLimitConfig();
  if (!config) {
    throw Object.assign(new Error("Rate limit configuration invalid"), { statusCode: 503 });
  }

  const bucketKey = `spots:${ip}`;
  const supabase = getAdminClient();
  const { data, error } = await supabase.rpc("consume_ip_rate_limit", {
    _bucket_key: bucketKey,
    _max_hits: config.maxHits,
    _window_seconds: config.windowSeconds,
  });

  if (error) {
    throw Object.assign(new Error("Rate limit unavailable"), { statusCode: 503 });
  }

  if (data !== true) {
    throw Object.assign(new Error("Too many requests"), { statusCode: 429 });
  }
};
