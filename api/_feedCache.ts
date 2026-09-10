import { getAdminClient } from "./_shared.js";

const SPOTS_CACHE_KEY = "spots:v1";
const SPOTS_TTL_SECONDS = 20;

export const readFeedCache = async <T>(cacheKey: string): Promise<T | null> => {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("feed_cache")
    .select("payload, expires_at")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  if (error || !data) return null;
  if (new Date(data.expires_at).getTime() <= Date.now()) return null;
  return data.payload as T;
};

export const writeFeedCache = async (cacheKey: string, payload: unknown, ttlSeconds: number) => {
  const supabase = getAdminClient();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  await supabase.from("feed_cache").upsert(
    {
      cache_key: cacheKey,
      payload,
      expires_at: expiresAt,
    },
    { onConflict: "cache_key" },
  );
};

export const getSpotsCacheKey = () => SPOTS_CACHE_KEY;
export const getSpotsCacheTtlSeconds = () => SPOTS_TTL_SECONDS;
