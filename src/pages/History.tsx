import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { MapPin, Clock, History as HistoryIcon, Cloud, Lock, Sparkles, Download } from "lucide-react";
import { useDataSource, type Session } from "@/hooks/useDataSource";
import { useAuth } from "@/hooks/useAuth";
import { usePremium } from "@/hooks/usePremium";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import { FREE_HISTORY_DAYS } from "@/lib/premiumLimits";
import { PremiumSoftPrompt } from "@/components/PremiumSoftPrompt";

type Filter = "today" | "week" | "all";

const History = () => {
  const { user } = useAuth();
  const { premium } = usePremium();
  const { sessions, loading } = useDataSource();
  const [filter, setFilter] = useState<Filter>("week");

  // Free tier: max 60 dagen historiek (premium = onbeperkt)
  const horizonMs = FREE_HISTORY_DAYS * 86_400_000;
  const olderHidden = useMemo(() => {
    if (premium) return 0;
    const cutoff = Date.now() - horizonMs;
    return sessions.filter((r) => new Date(r.started_at).getTime() < cutoff).length;
  }, [sessions, premium, horizonMs]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const dayMs = 86_400_000;
    return sessions.filter((r) => {
      const t = new Date(r.started_at).getTime();
      // Free tier horizon
      if (!premium && now - t > horizonMs) return false;
      if (filter === "today")
        return now - t < dayMs && new Date(r.started_at).toDateString() === new Date().toDateString();
      if (filter === "week") return now - t < 7 * dayMs;
      return true;
    });
  }, [sessions, filter, premium, horizonMs]);

  const grouped = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const r of filtered) {
      const key = groupLabel(new Date(r.started_at));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="app-page-panel space-y-5">
      <PageHeader title="Geschiedenis" subtitle="Je vorige Shop&Go sessies" />

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["today", "week", "all"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-base",
                filter === f
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {f === "today" ? "Vandaag" : f === "week" ? "Week" : "Alles"}
            </button>
          ))}
        </div>
        {premium && (
          <button
            onClick={() => {
              toast.success("PDF Export wordt voorbereid...");
              setTimeout(() => window.print(), 1000);
            }}
            className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary/20"
          >
            <Download className="h-3.5 w-3.5" /> Exporteer
          </button>
        )}
      </div>

      {!premium && filter === "all" && olderHidden > 0 && (
        <PremiumSoftPrompt
          id="history-horizon"
          title={`${olderHidden} oudere sessie${olderHidden === 1 ? "" : "s"} verborgen`}
          description={`Gratis toon je laatste ${FREE_HISTORY_DAYS} dagen. Premium toont je volledige historiek + PDF export.`}
        />
      )}

      {loading ? (
        <div className="grid h-40 place-items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-border bg-card p-8 text-center">
          <div className="mint-icon-tile mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl">
            <HistoryIcon className="h-7 w-7 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Nog geen sessies in deze periode</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([label, items]) => (
            <section key={label}>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {label}
              </h2>
              <div className="space-y-2">
                {items.map((r) => (
                  <SessionCard key={r.id} row={r} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {!user && (
        <Link
          to="/sync"
          className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground shadow-soft transition-base hover:border-primary/40"
        >
          <span className="flex items-center gap-2.5">
            <Cloud className="h-4 w-4 text-primary" />
            Bewaar historiek in cloud
          </span>
          <span className="text-xs text-muted-foreground">Inloggen →</span>
        </Link>
      )}
    </div>
  );
};

const SessionCard = ({ row }: { row: Session }) => {
  const start = new Date(row.started_at);
  const isActive = !row.ended_at;
  const end = row.ended_at ? new Date(row.ended_at) : null;
  const minutes = end ? Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000)) : 0;

  // Status:
  //  - active session (no ended_at, or zero duration): green pulsing "● Actief"
  //  - ended ≤ 30 min: green "✅ Op tijd"
  //  - ended > 30 min: red "⚠️ Te laat"
  const showActive = isActive || minutes === 0;
  const onTime = !showActive && minutes <= 30;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start gap-3">
        {row.car && (
          <span
            className="mt-1 h-3 w-3 shrink-0 rounded-full ring-2 ring-background"
            style={{ backgroundColor: row.car.color_hex }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">
              {start.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}
            </span>
            {showActive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-success">
                <Clock className="h-3 w-3" /> Actief
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> {minutes} min
              </span>
            )}
          </div>
          {row.address && (
            <div className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="line-clamp-2">{row.address}</span>
            </div>
          )}
          {row.car && (
            <div className="mt-1 text-xs text-muted-foreground">
              {row.car.name}
              {row.car.plate && ` · ${row.car.plate}`}
            </div>
          )}

          <div className="mt-2">
            {showActive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-bold text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot" />
                Actief
              </span>
            ) : onTime ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-bold text-success">
                ✅ Op tijd
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-0.5 text-[11px] font-bold text-destructive">
                ⚠️ Te laat
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const groupLabel = (d: Date): string => {
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Vandaag";
  if (d.toDateString() === y.toDateString()) return "Gisteren";
  const diff = (today.getTime() - d.getTime()) / 86_400_000;
  if (diff < 7) return "Deze week";
  return d.toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" });
};

export default History;
