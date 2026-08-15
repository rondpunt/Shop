// Crowd-only spot signal: NEVER guess based on time-of-day.
// A spot is only marked busy/full when real users have actively reported it
// within the last 30 minutes (= one Shop&Go session). Otherwise we show "free / no recent reports".

export type SpotReport = {
  id: string;
  spot_id: string;
  status: "free" | "busy" | "full";
  note: string | null;
  created_at: string;
};

export type SpotSignalLevel =
  | "free"          // no recent occupied report → assume available
  | "likely-busy"   // someone reported busy recently
  | "likely-full";  // someone reported full recently

export type SpotSignal = {
  level: SpotSignalLevel;
  label: string;
  detail: string;
  freshness: string;
  recentCount: number;
};

// Reports are only meaningful within one Shop&Go cycle.
const MAX_AGE_MIN = 30;

const minutesSince = (iso: string, now = Date.now()) =>
  Math.max(0, (now - new Date(iso).getTime()) / 60_000);

const formatFreshness = (mins: number) => {
  if (mins < 1) return "net nu";
  if (mins < 60) return `${Math.round(mins)} min geleden`;
  const h = Math.round(mins / 60);
  return h === 1 ? "1 uur geleden" : `${h} uur geleden`;
};

export const buildSignal = (
  reports: SpotReport[],
  now: Date = new Date()
): SpotSignal => {
  const fresh = reports.filter(
    (r) => minutesSince(r.created_at, now.getTime()) <= MAX_AGE_MIN
  );

  // Look only at the most recent report per status — the freshest signal wins.
  const occupied = fresh.filter((r) => r.status === "busy" || r.status === "full");

  if (occupied.length === 0) {
    return {
      level: "free",
      label: "Vermoedelijk vrij",
      detail:
        "Geen recente meldingen van bezetting. Ter plekke checken blijft nodig.",
      freshness: "",
      recentCount: 0,
    };
  }

  // Newest occupied report drives the level.
  const newest = occupied.reduce((m, r) =>
    new Date(r.created_at) > new Date(m.created_at) ? r : m
  );
  const level: SpotSignalLevel = newest.status === "full" ? "likely-full" : "likely-busy";
  const freshness = formatFreshness(minutesSince(newest.created_at, now.getTime()));

  return {
    level,
    label: level === "likely-full" ? "Recent gemeld als vol" : "Recent gemeld als bezet",
    detail: `${occupied.length} ${occupied.length === 1 ? "melding" : "meldingen"} in laatste ${MAX_AGE_MIN} min.`,
    freshness,
    recentCount: occupied.length,
  };
};

export const SIGNAL_THEME: Record<
  SpotSignalLevel,
  { ring: string; dot: string; text: string; bg: string }
> = {
  free: {
    ring: "ring-success/40",
    dot: "bg-success",
    text: "text-success",
    bg: "bg-success/10",
  },
  "likely-busy": {
    ring: "ring-warning/40",
    dot: "bg-warning",
    text: "text-warning",
    bg: "bg-warning/10",
  },
  "likely-full": {
    ring: "ring-destructive/40",
    dot: "bg-destructive",
    text: "text-destructive",
    bg: "bg-destructive/10",
  },
};
