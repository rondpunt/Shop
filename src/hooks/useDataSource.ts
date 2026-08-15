import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { localStore, type LocalCar, type LocalSession } from "@/lib/localStore";
import { updateNativeWidget } from "@/lib/widgetTimer";

// Unified shape used by all pages, regardless of cloud vs local storage.
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

const fromLocalCar = (c: LocalCar): Car => ({
  id: c.id,
  name: c.name,
  plate: c.plate,
  color_hex: c.color_hex,
  is_default: c.is_default,
});

const fromLocalSession = (s: LocalSession, cars: LocalCar[]): Session => {
  const car = cars.find((c) => c.id === s.car_id);
  return {
    id: s.id,
    car_id: s.car_id,
    started_at: s.started_at,
    ends_at: s.ends_at,
    ended_at: s.ended_at,
    lat: s.lat,
    lng: s.lng,
    address: s.address,
    note: s.note,
    photo_url: s.photo_dataurl,
    car: car ? { name: car.name, plate: car.plate, color_hex: car.color_hex } : null,
  };
};

export const useDataSource = () => {
  const { user } = useAuth();
  const isCloud = !!user;

  const [cars, setCars] = useState<Car[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const reloadLocal = useCallback(() => {
    const lc = localStore.getCars();
    const ls = localStore.getSessions();
    setCars(lc.map(fromLocalCar));
    setSessions(ls.map((s) => fromLocalSession(s, lc)));
    setLoading(false);
  }, []);

  const reloadCloud = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: carRows }, { data: sessRows }] = await Promise.all([
      supabase.from("cars").select("id, name, plate, color_hex, is_default").order("created_at"),
      supabase
        .from("sessions")
        .select(
          "id, car_id, started_at, ends_at, ended_at, lat, lng, address, note, photo_url, cars(name, plate, color_hex)"
        )
        .order("started_at", { ascending: false })
        .limit(200),
    ]);
    setCars((carRows ?? []) as Car[]);
    setSessions(
      (sessRows ?? []).map((r: any) => ({
        ...r,
        car: r.cars ?? null,
      })) as Session[]
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (isCloud) {
      reloadCloud();
    } else {
      reloadLocal();
      const onCars = () => reloadLocal();
      const onSess = () => reloadLocal();
      window.addEventListener("shopgo:local-cars", onCars);
      window.addEventListener("shopgo:local-sessions", onSess);
      return () => {
        window.removeEventListener("shopgo:local-cars", onCars);
        window.removeEventListener("shopgo:local-sessions", onSess);
      };
    }
  }, [isCloud, reloadCloud, reloadLocal]);

  // ---------- mutations ----------

  const addCar = async (input: Omit<Car, "id">) => {
    if (isCloud && user) {
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
    }
    const created = localStore.addCar({
      name: input.name,
      plate: input.plate,
      color_hex: input.color_hex,
      is_default: input.is_default,
    });
    return fromLocalCar(created);
  };

  const updateCar = async (id: string, patch: Partial<Omit<Car, "id">>) => {
    if (isCloud) {
      const { error } = await supabase.from("cars").update(patch).eq("id", id);
      if (error) throw error;
      await reloadCloud();
      return;
    }
    localStore.updateCar(id, patch);
  };

  const deleteCar = async (id: string) => {
    if (isCloud) {
      const { error } = await supabase.from("cars").delete().eq("id", id);
      if (error) throw error;
      await reloadCloud();
      return;
    }
    localStore.deleteCar(id);
  };

  const setDefaultCar = async (id: string) => {
    if (isCloud) {
      const { error } = await supabase.from("cars").update({ is_default: true }).eq("id", id);
      if (error) throw error;
      await reloadCloud();
      return;
    }
    localStore.setDefaultCar(id);
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
    if (isCloud && user) {
      const { data, error } = await supabase
        .from("sessions")
        .insert({ ...input, user_id: user.id })
        .select(
          "id, car_id, started_at, ends_at, ended_at, lat, lng, address, note, photo_url, cars(name, plate, color_hex)"
        )
        .single();
      if (error) throw error;
      await reloadCloud();
      return { ...(data as any), car: (data as any).cars ?? null };
    }
    const s = localStore.startSession(input);
    const lc = localStore.getCars();
    return fromLocalSession(s, lc);
  };

  const updateSession = async (id: string, patch: Partial<Session>) => {
    if (isCloud) {
      // strip nested fields
      const { car, photo_url, ...rest } = patch as any;
      const dbPatch: any = { ...rest };
      if (photo_url !== undefined) dbPatch.photo_url = photo_url;
      const { error } = await supabase.from("sessions").update(dbPatch).eq("id", id);
      if (error) throw error;
      await reloadCloud();
      return;
    }
    const localPatch: Partial<LocalSession> = {};
    if (patch.note !== undefined) localPatch.note = patch.note;
    if (patch.address !== undefined) localPatch.address = patch.address;
    if (patch.lat !== undefined) localPatch.lat = patch.lat;
    if (patch.lng !== undefined) localPatch.lng = patch.lng;
    if (patch.ended_at !== undefined) localPatch.ended_at = patch.ended_at;
    if ((patch as any).photo_url !== undefined) localPatch.photo_dataurl = (patch as any).photo_url;
    localStore.updateSession(id, localPatch);
  };

  const endSession = async (id: string) => {
    await updateSession(id, { ended_at: new Date().toISOString() });
  };

  const getSession = async (id: string): Promise<Session | null> => {
    if (isCloud) {
      const { data, error } = await supabase
        .from("sessions")
        .select(
          "id, car_id, started_at, ends_at, ended_at, lat, lng, address, note, photo_url, cars(name, plate, color_hex)"
        )
        .eq("id", id)
        .maybeSingle();
      if (error || !data) return null;
      return { ...(data as any), car: (data as any).cars ?? null } as Session;
    }
    const s = localStore.getSession(id);
    if (!s) return null;
    return fromLocalSession(s, localStore.getCars());
  };

  const activeSession = sessions.find(
    (s) => !s.ended_at && new Date(s.ends_at).getTime() + 60_000 > Date.now()
  ) ?? null;

  const activeId = activeSession?.id;
  const activeEndsAt = activeSession?.ends_at;
  const activeAddress = activeSession?.address;

  useEffect(() => {
    if (activeId && activeEndsAt) {
      updateNativeWidget(activeEndsAt, activeAddress);
    } else {
      updateNativeWidget(null, null);
    }
  }, [activeId, activeEndsAt, activeAddress]);

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
    reload: isCloud ? reloadCloud : reloadLocal,
  };
};
