import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { buildSignal, type SpotReport, type SpotSignal } from "@/lib/spotSignal";

const FRESH_WINDOW_MIN = 90;

const fetchReports = async (spotId: string): Promise<SpotReport[]> => {
  const since = new Date(Date.now() - FRESH_WINDOW_MIN * 60_000).toISOString();
  // Read from the public-safe view which excludes user_id, lat/lng and notes.
  const { data, error } = await supabase
    .from("spot_reports_public" as any)
    .select("id, spot_id, status, created_at")
    .eq("spot_id", spotId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ ...r, note: null })) as SpotReport[];
};

export const useSpotReports = (spotId: string | null) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [now, setNow] = useState(() => new Date());

  // Re-evaluate the signal once a minute so freshness stays accurate
  // without a re-fetch storm.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const query = useQuery({
    queryKey: ["spot-reports", spotId],
    queryFn: () => fetchReports(spotId!),
    enabled: !!spotId,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  // Periodic refetch instead of realtime: spot_reports is no longer in the
  // realtime publication (events would otherwise leak across users).
  useEffect(() => {
    if (!spotId) return;
    const t = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["spot-reports", spotId] });
    }, 30_000);
    return () => clearInterval(t);
  }, [spotId, queryClient]);

  const reports = useMemo(() => query.data ?? [], [query.data]);

  const signal: SpotSignal = useMemo(
    () => buildSignal(reports, now),
    [reports, now]
  );

  const submit = useMutation({
    mutationFn: async (input: { status: SpotReport["status"]; note?: string }) => {
      if (!spotId) throw new Error("Geen locatie geselecteerd");
      if (!user) throw new Error("Log in om een melding te delen");
      const { error } = await supabase.from("spot_reports").insert({
        spot_id: spotId,
        status: input.status,
        note: input.note ?? null,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bedankt voor je melding!");
      queryClient.invalidateQueries({ queryKey: ["spot-reports", spotId] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Iets ging mis";
      toast.error(msg);
    },
  });

  return {
    reports,
    signal,
    isLoading: query.isLoading,
    canSubmit: !!user,
    submit: submit.mutate,
    submitting: submit.isPending,
  };
};
