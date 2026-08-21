import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { updateNativeWidget } from "@/lib/widgetTimer";

// Unified shape used by all pages, regardless of the Supabase schema.
export type Car = {
  id: string;
  name: string;
  plate: string | null;
  color_hex: string;
  is_default: boolean;
};

export type Session = {
  id: string;
  car_id: string | null;
  started_at: string;
  ends_at: string;
  ended_at: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  note: string | null;
  photo_url: string | null;
  spot_id?: string | null;
  car?: { name: string; plate: string | null; color_hex: string } | null;
};

const cloudRequired = () => {
  throw new Error("Meld je aan om je parkeerdata veilig in de cloud te bewaren.");
};

export const useDataSource = () => {
  const { user, session } = useAuth();
  const isCloud = Boolean(user && session);
  const [cars, setCars] = useState<Car[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const reloadCloud = useCallback(async () => {
    if (!user || !session) {
      setCars([]);
      setSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [{ data: carRows, error: carsError }, { data: sessRows, error: sessionsError }] =
        await Promise.all([
          supabase.from("cars").select("id, name, plate, color_hex, is_default").order("created_at"),
          supabase
            .from("sessions")
            .select(
              "id, car_id, started_at, ends_at, ended_at, lat, lng, address, note, photo_url, spot_id, cars(name, plate, color_hex)"
            )
            .order("started_at", { ascending: false })
            .limit(200),
        ]);

      if (carsError) throw carsError;
      if (sessionsError) throw sessionsError;

      setCars((carRows ?? []) as Car[]);
      setSessions(
        (sessRows ?? []).map((row: any) => ({
          ...row,
          car: row.cars ?? null,
        })) as Session[]
      );
    } catch (error) {
      console.error("Clouddata kon niet worden geladen:", error);
      setCars([]);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [session, user]);

  useEffect(() => {
    void reloadCloud();
  }, [reloadCloud]);

  const addCar = async (input: Omit<Car, "id">) => {
    if (!isCloud || !user) return cloudRequired();
    const { data, error } = await supabase
      .from("cars")
      .insert({
        user_id: user.id,
        name: input.name,
        plate: input.plate,
        color_hex: input.color_hex,
        is_default: input.is_default,
      })
      .select()
      .single();
    if (error) throw error;
    await reloadCloud();
    return data as Car;
  };

  const updateCar = async (id: string, patch: Partial<Omit<Car, "id">>) => {
    if (!isCloud) return cloudRequired();
    const { error } = await supabase.from("cars").update(patch).eq("id", id);
    if (error) throw error;
    await reloadCloud();
  };

  const deleteCar = async (id: string) => {
    if (!isCloud) return cloudRequired();
    const { error } = await supabase.from("cars").delete().eq("id", id);
    if (error) throw error;
    await reloadCloud();
  };

  const setDefaultCar = async (id: string) => {
    if (!isCloud) return cloudRequired();
    const { error } = await supabase.from("cars").update({ is_default: true }).eq("id", id);
    if (error) throw error;
    await reloadCloud();
  };

  const startSession = async (input: {
    car_id: string | null;
    started_at: string;
    ends_at: string;
    lat: number | null;
    lng: number | null;
    address: string | null;
    spot_id?: string | null;
  }): Promise<Session> => {
    if (!isCloud || !user) return cloudRequired();
    const { data, error } = await supabase
      .from("sessions")
      .insert({ ...input, user_id: user.id })
      .select(
        "id, car_id, started_at, ends_at, ended_at, lat, lng, address, note, photo_url, spot_id, cars(name, plate, color_hex)"
      )
      .single();
    if (error) throw error;
    await reloadCloud();
    return { ...(data as any), car: (data as any).cars ?? null };
  };

  const updateSession = async (id: string, patch: Partial<Session>) => {
    if (!isCloud) return cloudRequired();
    const { car, ...rest } = patch as any;
    const { error } = await supabase.from("sessions").update(rest).eq("id", id);
    if (error) throw error;
    await reloadCloud();
  };

  const endSession = async (id: string) => {
    await updateSession(id, { ended_at: new Date().toISOString() });
  };

  const getSession = async (id: string): Promise<Session | null> => {
    if (!isCloud) return cloudRequired();
    const { data, error } = await supabase
      .from("sessions")
      .select(
        "id, car_id, started_at, ends_at, ended_at, lat, lng, address, note, photo_url, spot_id, cars(name, plate, color_hex)"
      )
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return { ...(data as any), car: (data as any).cars ?? null } as Session;
  };

  const activeSession =
    sessions.find((item) => !item.ended_at && new Date(item.ends_at).getTime() + 60_000 > Date.now()) ?? null;

  useEffect(() => {
    if (activeSession?.id && activeSession.ends_at) {
      updateNativeWidget(activeSession.ends_at, activeSession.address);
    } else {
      updateNativeWidget(null, null);
    }
  }, [activeSession?.address, activeSession?.ends_at, activeSession?.id]);

  return {
    isCloud,
    loading,
    cars,
    sessions,
    activeSession,
    addCar,
    updateCar,
    deleteCar,
    setDefaultCar,
    startSession,
    updateSession,
    endSession,
    getSession,
    reload: reloadCloud,
  };
};