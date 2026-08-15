import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type TopSpot = {
  id: string;
  name: string;
  street?: string;
  distance_m: number;
  free_chance: number;
  score: number;
};

type AssistantResponse = {
  advice: string;
  top_spots: TopSpot[];
};

export const useParkingAssistant = () => {
  const [data, setData] = useState<AssistantResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async (input: {
    lat: number | null;
    lng: number | null;
    question?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: invokeErr } = await supabase.functions.invoke(
        "shopgo-assistant",
        {
          body: {
            lat: input.lat ?? 50.8267,
            lng: input.lng ?? 3.2647,
            hour: new Date().getHours(),
            weekday: new Date().getDay(),
            question: input.question ?? "",
          },
        },
      );
      if (invokeErr) throw invokeErr;
      setData(result as AssistantResponse);
      return result as AssistantResponse;
    } catch (e: any) {
      const msg = e?.message ?? "AI-advies niet beschikbaar.";
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, ask, reset: () => setData(null) };
};
