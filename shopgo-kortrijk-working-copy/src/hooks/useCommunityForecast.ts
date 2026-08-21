import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CommunityForecast = {
  spot_id: string;
  active_sessions: number;
  departing_5m: number;
  departing_10m: number;
  overdue_sessions: number;
};

const loadForecast = async (): Promise<CommunityForecast[]> => {
  const { data, error } = await (supabase.rpc as any)("get_spot_forecast_public");
  if (error) throw error;
  return ((data ?? []) as any[]).map((row) => ({
    spot_id: String(row.spot_id),
    active_sessions: Number(row.active_sessions || 0),
    departing_5m: Number(row.departing_5m || 0),
    departing_10m: Number(row.departing_10m || 0),
    overdue_sessions: Number(row.overdue_sessions || 0),
  }));
};

export const useCommunityForecast = (spotId?: string | null) => {
  const query = useQuery({
    queryKey: ["community-forecast"],
    queryFn: loadForecast,
    staleTime: 20_000,
    refetchInterval: 30_000,
    retry: 1,
  });

  const forecast = spotId ? (query.data ?? []).find((r) => r.spot_id === spotId) ?? null : null;
  return {
    forecast,
    all: query.data ?? [],
    isLoading: query.isLoading,
    unavailable: !!query.error,
  };
};
