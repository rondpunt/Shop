import { useCallback, useEffect, useState } from "react";

const KEY = "shopgo:favorites:v1";

export type FavoriteSpot = {
  id: string;          // zone id of spot id
  name: string;
  lat: number;
  lng: number;
  addedAt: string;
};

const read = (): FavoriteSpot[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<FavoriteSpot[]>([]);

  useEffect(() => {
    setFavorites(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setFavorites(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = (next: FavoriteSpot[]) => {
    setFavorites(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const add = useCallback((spot: Omit<FavoriteSpot, "addedAt">) => {
    const current = read();
    if (current.some((f) => f.id === spot.id)) return;
    persist([{ ...spot, addedAt: new Date().toISOString() }, ...current]);
  }, []);

  const remove = useCallback((id: string) => {
    persist(read().filter((f) => f.id !== id));
  }, []);

  const toggle = useCallback((spot: Omit<FavoriteSpot, "addedAt">) => {
    const current = read();
    if (current.some((f) => f.id === spot.id)) {
      persist(current.filter((f) => f.id !== spot.id));
      return false;
    }
    persist([{ ...spot, addedAt: new Date().toISOString() }, ...current]);
    return true;
  }, []);

  const isFavorite = useCallback(
    (id: string) => favorites.some((f) => f.id === id),
    [favorites]
  );

  return { favorites, add, remove, toggle, isFavorite };
};
