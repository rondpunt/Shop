export type SpotReport = {
  id: string;
  spot_id: string;
  status: "free" | "busy" | "full";
  note?: string | null;
  created_at: string;
};

export type ReleasePrediction = {
  active_count: number;
  releasing_5m: number;
  releasing_10m: number;
  next_release_at: string | null;
};

export type SpotSignalLevel = "free" | "likely-busy" | "likely-full" | "releasing-soon" | "unknown";

export type SpotSignal = {
  level: SpotSignalLevel;
  label: string;
  detail: string;
  freshness: string;
  recentCount: number;
  releaseText?: string;
};

const MAX_AGE_MIN = 30;
const minutesSince = (iso: string, now = Date.now()) => Math.max(0, (now - new Date(iso).getTime()) / 60_000);
const formatFreshness = (mins: number) => mins < 1 ? "net nu" : mins < 60 ? `${Math.round(mins)} min geleden` : `${Math.round(mins / 60)} u geleden`;

export const buildSignal = (reports: SpotReport[], prediction?: ReleasePrediction | null, now: Date = new Date()): SpotSignal => {
  const fresh = reports
    .filter((r) => minutesSince(r.created_at, now.getTime()) <= MAX_AGE_MIN)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  const newest = fresh[0];
  const soon = prediction?.releasing_5m ?? 0;
  const later = prediction?.releasing_10m ?? 0;
  const releaseText = soon > 0
    ? `${soon} ${soon === 1 ? "sessie eindigt" : "sessies eindigen"} binnen 5 min`
    : later > 0
      ? `${later} ${later === 1 ? "sessie eindigt" : "sessies eindigen"} binnen 10 min`
      : undefined;

  if (newest?.status === "free") return {
    level: "free",
    label: "Net vrij gemeld",
    detail: "Een bestuurder meldde recent dat hier plaats vrijkwam. Controleer altijd ter plaatse.",
    freshness: formatFreshness(minutesSince(newest.created_at, now.getTime())),
    recentCount: fresh.length,
    releaseText,
  };

  if (releaseText) return {
    level: "releasing-soon",
    label: "Mogelijk binnenkort vrij",
    detail: "Gebaseerd op anonieme actieve 30-minutensessies. Dit is een kanssignaal, geen reservatie of garantie.",
    freshness: newest ? formatFreshness(minutesSince(newest.created_at, now.getTime())) : "",
    recentCount: fresh.length,
    releaseText,
  };

  if (newest?.status === "full") return {
    level: "likely-full",
    label: "Recent als vol gemeld",
    detail: "Recente communitymelding. De situatie kan intussen gewijzigd zijn.",
    freshness: formatFreshness(minutesSince(newest.created_at, now.getTime())),
    recentCount: fresh.length,
  };

  if (newest?.status === "busy") return {
    level: "likely-busy",
    label: "Recent als druk gemeld",
    detail: "Recente communitymelding. Combineer dit met de officiële live Shop&Go-data.",
    freshness: formatFreshness(minutesSince(newest.created_at, now.getTime())),
    recentCount: fresh.length,
  };

  return {
    level: "unknown",
    label: "Geen recente communitymeldingen",
    detail: "De officiële live beschikbaarheid blijft de hoofdbron.",
    freshness: "",
    recentCount: 0,
  };
};

export const SIGNAL_THEME: Record<SpotSignalLevel, { ring: string; dot: string; text: string; bg: string }> = {
  free: { ring: "ring-success/35", dot: "bg-success", text: "text-success", bg: "bg-success/10" },
  "releasing-soon": { ring: "ring-primary/35", dot: "bg-primary", text: "text-primary", bg: "bg-primary/10" },
  "likely-busy": { ring: "ring-warning/35", dot: "bg-warning", text: "text-warning", bg: "bg-warning/10" },
  "likely-full": { ring: "ring-destructive/35", dot: "bg-destructive", text: "text-destructive", bg: "bg-destructive/10" },
  unknown: { ring: "ring-border", dot: "bg-muted-foreground", text: "text-muted-foreground", bg: "bg-muted/40" },
};
