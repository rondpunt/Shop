import { Activity, Clock3, MessageCircle, Users } from "lucide-react";
import { useCommunityForecast } from "@/hooks/useCommunityForecast";
import { useSpotReports } from "@/hooks/useSpotReports";
import { cn } from "@/lib/utils";

type Props = {
  spotId: string;
  freeBays: number;
  totalBays: number;
  compact?: boolean;
};

export const ZoneIntelligence = ({ spotId, freeBays, totalBays, compact = false }: Props) => {
  const { forecast } = useCommunityForecast(spotId);
  const { signal } = useSpotReports(spotId);
  const soon5 = forecast?.departing_5m ?? 0;
  const soon10 = forecast?.departing_10m ?? 0;
  const incoming = soon5 + soon10;
  const communityFresh = signal.recentCount > 0;

  if (compact) {
    return (
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className={cn("smart-chip", freeBays > 0 ? "smart-chip-good" : "smart-chip-neutral")}>
          <Activity className="h-3.5 w-3.5" /> {freeBays}/{totalBays} nu vrij
        </span>
        {incoming > 0 && (
          <span className="smart-chip smart-chip-soon">
            <Clock3 className="h-3.5 w-3.5" /> {incoming} mogelijk binnen 10 min
          </span>
        )}
        {communityFresh && (
          <span className="smart-chip smart-chip-community">
            <Users className="h-3.5 w-3.5" /> {signal.recentCount} recente {signal.recentCount === 1 ? "melding" : "meldingen"}
          </span>
        )}
      </div>
    );
  }

  return (
    <section className="mt-4 overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.055] p-4 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/45">Live inzicht</div>
          <h3 className="mt-1 text-[15px] font-bold text-white">Wat gebeurt hier nu?</h3>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-2.5 py-1 text-[10px] font-bold text-primary ring-1 ring-primary/20">
          <span className="h-1.5 w-1.5 rounded-full bg-primary pulse-dot" /> Parko + community
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Metric label="Nu vrij" value={`${freeBays}`} sub={`van ${totalBays}`} tone={freeBays > 0 ? "good" : "bad"} />
        <Metric label="≤ 5 min" value={`${soon5}`} sub="kan vrijkomen" tone={soon5 > 0 ? "soon" : "plain"} />
        <Metric label="5–10 min" value={`${soon10}`} sub="kan vrijkomen" tone={soon10 > 0 ? "soon" : "plain"} />
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-2xl bg-black/15 px-3 py-2.5 text-[11px] leading-snug text-white/62">
        <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <span>
          {communityFresh
            ? `${signal.label}${signal.freshness ? ` · ${signal.freshness}` : ""}. Communitysignalen zijn indicatief; de live Parko-sensoren blijven leidend.`
            : "Nog geen recente communitymelding. De aantallen hierboven komen primair uit de live Parko-sensoren; vertrektijden zijn alleen een verwachting op basis van app-timers."}
        </span>
      </div>
    </section>
  );
};

const Metric = ({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "good" | "bad" | "soon" | "plain" }) => (
  <div className="rounded-2xl bg-white/[0.06] px-3 py-3 ring-1 ring-white/[0.07]">
    <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/40">{label}</div>
    <div className={cn("mt-1 font-display text-[24px] leading-none", tone === "good" && "text-primary", tone === "bad" && "text-destructive", tone === "soon" && "text-warning", tone === "plain" && "text-white")}>{value}</div>
    <div className="mt-1 text-[9.5px] font-medium text-white/38">{sub}</div>
  </div>
);
