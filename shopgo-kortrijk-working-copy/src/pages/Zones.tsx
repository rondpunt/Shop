import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Search, Activity } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useParkoLive, type ParkoZone } from "@/hooks/useParkoLive";
import { NearbyMap } from "@/components/NearbyMap";
import { distKm, driveMin, formatDist, walkMin, zoneStatus } from "@/lib/parko";
import { cn } from "@/lib/utils";

const Zones = () => {
  const navigate = useNavigate();
  const { data, loading, error } = useParkoLive();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"distance" | "free">("distance");

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }, []);

  const zones = useMemo(() => data?.zones ?? [], [data?.zones]);

  const filtered = useMemo(() => {
    let list = zones;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((z) => z.name.toLowerCase().includes(q));
    }
    return list
      .map((z) => ({ z, d: coords ? distKm(coords, z) : null }))
      .sort((a, b) => {
        if (sortBy === "free") return b.z.freeBays - a.z.freeBays;
        if (a.d === null) return 0;
        return (a.d ?? 0) - (b.d ?? 0);
      });
  }, [zones, query, sortBy, coords]);

  const fetchedLabel = data?.fetchedAt
    ? new Date(data.fetchedAt).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  return (
    <div className="app-page-panel">
      <PageHeader
        title="Shop&Go in Kortrijk"
        subtitle="Live beschikbaarheid · ververst om de 30 sec"
      />

      {/* Live KPI */}
      <div className="card-soft flex items-center gap-3 p-4">
        <span className="mint-icon-tile grid h-11 w-11 place-items-center rounded-xl">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Activity className="h-5 w-5" />}
        </span>
        <div className="flex-1">
          {error ? (
            <div className="text-sm font-bold text-destructive">Live data niet beschikbaar</div>
          ) : data ? (
            <>
              <div className="text-[15px] font-bold">
                <span className="text-success">{data.totalFree}</span>{" "}
                <span className="text-muted-foreground">van {data.totalBays} plaatsen vrij</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-success pulse-dot align-middle" />{" "}
                Live bijgewerkt {fetchedLabel}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Live data laden…</div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold">
        <span className="pill pill-free">🟢 Vrij</span>
        <span className="pill pill-warn">🟠 Bijna vol</span>
        <span className="pill pill-full">🔴 Vol</span>
        <span className="pill pill-gray">⚪ Onbekend</span>
      </div>

      {/* Map */}
      <div className="mt-4">
        <NearbyMap
          userCoords={coords}
          zones={zones}
          onZoneTap={(z) => navigate(`/locatie/${encodeURIComponent(z.id)}`)}
          height={260}
          initialFilter="free"
        />
      </div>

      {/* Search */}
      <div className="mt-4">
        <div className="search-pill">
          <Search className="h-4 w-4 text-muted-foreground" strokeWidth={2.5} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek straat of plein…"
            className="flex-1 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Sort + count */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-[13px] font-bold text-white">Vrije locaties ({filtered.length})</span>
        <button
          type="button"
          onClick={() => setSortBy((s) => (s === "distance" ? "free" : "distance"))}
          className="text-xs font-bold text-primary"
        >
          {sortBy === "distance" ? "Dichtstbij ▾" : "Meeste vrij ▾"}
        </button>
      </div>

      {/* List */}
      <ul className="mt-3 space-y-2">
        {filtered.map(({ z, d }, idx) => (
          <ZoneRow key={`${z.id}-${idx}`} z={z} d={d} updatedAt={data?.fetchedAt} onClick={() => navigate(`/locatie/${encodeURIComponent(z.id)}`)} />
        ))}
        {filtered.length === 0 && !loading && (
          <li className="card-soft p-6 text-center text-sm text-muted-foreground">
            Geen locaties gevonden voor "{query}"
          </li>
        )}
      </ul>
    </div>
  );
};

const ZoneRow = ({
  z,
  d,
  updatedAt,
  onClick,
}: {
  z: ParkoZone;
  d: number | null;
  updatedAt?: string;
  onClick: () => void;
}) => {
  const status = zoneStatus(z);
  const badgeClass =
    status === "free" ? "pill-free" : status === "warn" ? "pill-warn" : status === "full" ? "pill-full" : "pill-gray";
  const badgeText =
    status === "unknown" ? "ONBEKEND" : status === "full" ? "VOL" : `${z.freeBays} VRIJ`;
  const numColor =
    status === "free" ? "bg-success" : status === "warn" ? "bg-warning" : status === "full" ? "bg-destructive" : "bg-muted-foreground/40";

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="card-soft flex flex-col w-full text-left transition-base hover:bg-muted/30 active:scale-[0.99] overflow-hidden"
      >
        <div className="flex w-full items-center gap-3 p-3.5">
          <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white font-bold text-sm", numColor)}>
            {z.totalBays === 0 ? "?" : z.freeBays}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-bold">{z.name}</span>
            <span className="block text-[11px] text-muted-foreground">
              {z.freeBays} vrije plaatsen · live sensordata{d !== null && ` · ${formatDist(d)}`}
            </span>
            <span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">
              Laatst bijgewerkt {updatedAt
                ? new Date(updatedAt).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })
                : "—"}
            </span>
            {d !== null && (
              <>
                <span className="mt-0.5 block text-[12px] font-semibold text-foreground">
                  🚗 {driveMin(d)} min · {formatDist(d)}
                </span>
                <span className="block text-[11px] font-medium text-muted-foreground">
                  🚶 {walkMin(d)} min stappen
                </span>
              </>
            )}
          </span>
          <span className={cn("pill", badgeClass)}>{badgeText}</span>
        </div>
      </button>
    </li>
  );
};

export default Zones;
