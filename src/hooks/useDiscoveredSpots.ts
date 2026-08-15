import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DiscoveredSpot = {
  id: string;
  spot_id: string;
  lat: number;
  lng: number;
  address: string | null;
  visit_count: number;
  first_seen_at: string;
  last_seen_at: string;
};

/**
 * Crowd-learned parking spots: anyone (anon or signed-in) can read.
 * Auto-refreshes via Postgres realtime when new spots are added or visit counts update.
 */
export const useDiscoveredSpots = (limit = 200) => {
  const [spots, setSpots] = useState<DiscoveredSpot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("discovered_spots")
        .select("id, spot_id, lat, lng, address, visit_count, first_seen_at, last_seen_at")
        .order("visit_count", { ascending: false })
        .limit(limit);
      if (!active) return;
      setSpots((data as DiscoveredSpot[]) ?? []);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("discovered_spots_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "discovered_spots" },
        () => load()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [limit]);

  return { spots, loading };
};
