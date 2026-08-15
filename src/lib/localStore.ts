// Robust local-first persistence layer.
// Wrapped in try/catch everywhere so localStorage corruption / quota errors
// can never crash the app.

const KEY_CARS = "shopgo.cars.v1";
const KEY_SESSIONS = "shopgo.sessions.v1";

export type LocalCar = {
  id: string;
  name: string;
  plate: string | null;
  color_hex: string;
  is_default: boolean;
  created_at: string;
};

export type LocalSession = {
  id: string;
  car_id: string | null;
  started_at: string;
  ends_at: string;
  ended_at: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  note: string | null;
  photo_dataurl: string | null;
};

const safeRead = (key: string): string | null => {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
};

const safeWrite = (key: string, value: string): void => {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  } catch {
    /* quota exceeded or storage disabled — fail silently */
  }
};

const safeRemove = (key: string): void => {
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const dispatch = (event: string) => {
  try {
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(event));
  } catch {
    /* ignore */
  }
};

const uuid = (): string => {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const localStore = {
  // ---------- cars ----------
  getCars(): LocalCar[] {
    const list = safeParse<LocalCar[]>(safeRead(KEY_CARS), []);
    return Array.isArray(list) ? list : [];
  },
  setCars(cars: LocalCar[]) {
    safeWrite(KEY_CARS, JSON.stringify(cars));
    dispatch("shopgo:local-cars");
  },
  addCar(input: Omit<LocalCar, "id" | "created_at">): LocalCar {
    const cars = localStore.getCars();
    const car: LocalCar = {
      ...input,
      id: uuid(),
      created_at: new Date().toISOString(),
    };
    if (car.is_default) cars.forEach((c) => (c.is_default = false));
    if (cars.length === 0) car.is_default = true;
    cars.push(car);
    localStore.setCars(cars);
    return car;
  },
  updateCar(id: string, patch: Partial<Omit<LocalCar, "id" | "created_at">>) {
    const cars = localStore.getCars().map((c) => (c.id === id ? { ...c, ...patch } : c));
    localStore.setCars(cars);
  },
  deleteCar(id: string) {
    const cars = localStore.getCars().filter((c) => c.id !== id);
    if (cars.length > 0 && !cars.some((c) => c.is_default)) cars[0].is_default = true;
    localStore.setCars(cars);
  },
  setDefaultCar(id: string) {
    const cars = localStore.getCars().map((c) => ({ ...c, is_default: c.id === id }));
    localStore.setCars(cars);
  },

  // ---------- sessions ----------
  getSessions(): LocalSession[] {
    const list = safeParse<LocalSession[]>(safeRead(KEY_SESSIONS), []);
    return Array.isArray(list) ? list : [];
  },
  setSessions(rows: LocalSession[]) {
    safeWrite(KEY_SESSIONS, JSON.stringify(rows));
    dispatch("shopgo:local-sessions");
  },
  getSession(id: string): LocalSession | null {
    return localStore.getSessions().find((s) => s.id === id) ?? null;
  },
  startSession(
    input: Omit<LocalSession, "id" | "ended_at" | "note" | "photo_dataurl"> & {
      note?: string | null;
      photo_dataurl?: string | null;
    }
  ): LocalSession {
    const sessions = localStore.getSessions();
    const session: LocalSession = {
      id: uuid(),
      car_id: input.car_id ?? null,
      started_at: input.started_at,
      ends_at: input.ends_at,
      ended_at: null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      address: input.address ?? null,
      note: input.note ?? null,
      photo_dataurl: input.photo_dataurl ?? null,
    };
    sessions.unshift(session);
    localStore.setSessions(sessions);
    return session;
  },
  updateSession(id: string, patch: Partial<LocalSession>) {
    const sessions = localStore.getSessions().map((s) => (s.id === id ? { ...s, ...patch } : s));
    localStore.setSessions(sessions);
  },
  endSession(id: string) {
    localStore.updateSession(id, { ended_at: new Date().toISOString() });
  },
  getActiveSession(): LocalSession | null {
    const now = Date.now();
    return (
      localStore
        .getSessions()
        .find((s) => !s.ended_at && new Date(s.ends_at).getTime() + 60_000 > now) ?? null
    );
  },

  // ---------- maintenance ----------
  hasAnyData(): boolean {
    return localStore.getCars().length > 0 || localStore.getSessions().length > 0;
  },
  clear() {
    safeRemove(KEY_CARS);
    safeRemove(KEY_SESSIONS);
    dispatch("shopgo:local-cars");
    dispatch("shopgo:local-sessions");
  },
};
