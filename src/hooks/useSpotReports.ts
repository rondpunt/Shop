import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { buildSignal, type SpotReport, type SpotSignal } from "@/lib/spotSignal";

const fetchReports = async (spotId: string): Promise<SpotReport[]> => {
  const { data, error } = await (supabase.rpc as any)("get_spot_reports_public", {
    _spot_id: spotId,
    _minutes: 90,
  });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: String(r.id),
    spot_id: String(r.spot_id),
    status: r.status,
    created_at: r.created_at,
    note: null,
  })) as SpotReport[];
};

export const useSpotReports = (spotId: string | null) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const query = useQuery({
    queryKey: ["spot-reports", spotId],
    queryFn: () => fetchReports(spotId!),
    enabled: !!spotId,
    staleTime: 30_000,
    refetchInterval: 45_000,
    retry: 1,
  });

  const reports = useMemo(() => query.data ?? [], [query.data]);
  const signal: SpotSignal = useMemo(() => buildSignal(reports, null, now), [reports, now]);

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
      toast.success("Melding gedeeld", { description: "Bedankt — dit helpt andere bestuurders." });
      queryClient.invalidateQueries({ queryKey: ["spot-reports", spotId] });
      queryClient.invalidateQueries({ queryKey: ["community-forecast"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Melding kon niet worden gedeeld"),
  });

  return {
    reports,
    signal,
    isLoading: query.isLoading,
    unavailable: !!query.error,
    canSubmit: !!user,
    submit: submit.mutate,
    submitting: submit.isPending,
  };
};
