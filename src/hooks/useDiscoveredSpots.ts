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
 * Public crowd-discovered parking locations via a privacy-safe RPC projection.
 * Direct table access stays private so creator/user identifiers cannot be enumerated.
 */
export const useDiscoveredSpots = (limit = 200) => {
  const [spots, setSpots] = useState<DiscoveredSpot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data, error } = await (supabase.rpc as any)("get_discovered_spots_public", {
        _limit: Math.min(Math.max(limit, 1), 500),
      });
      if (!active) return;
      if (error) {
        console.warn("Crowd parking locations are temporarily unavailable");
        setSpots([]);
      } else {
        setSpots((data as DiscoveredSpot[]) ?? []);
      }
      setLoading(false);
    };

    void load();
    const refresh = window.setInterval(load, 60_000);

    return () => {
      active = false;
      window.clearInterval(refresh);
    };
  }, [limit]);

  return { spots, loading };
};
