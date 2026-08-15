import { Navigation, MapPin, Loader2, ParkingMeter } from "lucide-react";
import { Link } from "react-router-dom";
import type { ParkoZone, ParkoPayload } from "@/hooks/useParkoLive";
import { tap } from "@/lib/haptics";

type Props = {
  parko: ParkoPayload | null;
  loading: boolean;
  userLoc: { lat: number; lng: number } | null;
};

const distKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const dLat = (a.lat - b.lat) * 111;
  const dLng = (a.lng - b.lng) * 70;
  return Math.hypot(dLat, dLng);
};

const formatDist = (km: number) =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

const navTo = (z: ParkoZone) => {
  tap();
  const url = `https://www.google.com/maps/dir/?api=1&destination=${z.lat},${z.lng}&travelmode=driving`;
  window.open(url, "_blank");
};

/**
 * Hero card on Home: shows nearest free Shop&Go spot + 3 alternatives.
 * Single-tap navigation, no map plan needed.
 */
export const FreeSpotCard = ({ parko, loading, userLoc }: Props) => {
  // Only zones with at least 1 free bay
  const freeZones = (parko?.zones ?? []).filter((z) => z.freeBays > 0);

  // Sort by distance from user (or by free count if no user location yet)
  const sorted = userLoc
    ? [...freeZones]
        .map((z) => ({ z, d: distKm(userLoc, z) }))
        .sort((a, b) => a.d - b.d)
    : [...freeZones]
        .sort((a, b) => b.freeBays - a.freeBays)
        .map((z) => ({ z, d: 0 }));

  const top = sorted[0];
  const others = sorted.slice(1, 4);

  if (loading && !parko) {
    return (
      <section className="rounded-3xl bg-card p-5 shadow-card">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm">Vrije plaatsen ophalen…</span>
        </div>
      </section>
    );
  }

  if (!top) {
    return (
      <section className="rounded-3xl border-2 border-destructive/30 bg-card p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/10">
            <ParkingMeter className="h-5 w-5 text-destructive" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-destructive">Geen vrije Shop&amp;Go plek</div>
            <div className="text-xs text-muted-foreground">
              Probeer opnieuw over een minuutje.
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl bg-card shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between bg-success/10 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-success">
            Vrije plaats nu
          </span>
        </div>
        <Link to="/zones" className="text-[11px] font-semibold text-primary hover:underline">
          Bekijk alle
        </Link>
      </div>

      {/* Top recommendation — big tap target */}
      <button
        type="button"
        onClick={() => navTo(top.z)}
        className="flex w-full items-center gap-4 p-4 text-left transition-base hover:bg-muted/30 active:scale-[0.995]"
      >
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-success text-white shadow-glow-green">
          <div className="text-center leading-none">
            <div className="font-display text-xl">{top.z.freeBays}<span className="text-xs font-normal opacity-85">/{top.z.totalBays}</span></div>
            <div className="text-[9px] font-bold uppercase tracking-wider opacity-90">vrij</div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-lg leading-tight text-primary-deep">
            {top.z.name}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span className="font-semibold text-foreground">
              {top.z.freeBays} van {top.z.totalBays} vrij {userLoc && `· ${formatDist(top.d)}`}
            </span>
          </div>
        </div>
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-soft">
          <Navigation className="h-5 w-5" fill="currentColor" />
        </div>
      </button>

      {/* Alternatives */}
      {others.length > 0 && (
        <div className="border-t border-border">
          <div className="px-4 pt-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Andere opties
          </div>
          <div className="divide-y divide-border">
            {others.map(({ z, d }, idx) => (
              <button
                key={`${z.id}-${idx}`}
                type="button"
                onClick={() => navTo(z)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-base hover:bg-muted/30"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-success/15 font-bold text-success">
                  {z.freeBays}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{z.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {userLoc ? formatDist(d) : `${z.totalBays} plaatsen`}
                  </div>
                </div>
                <Navigation className="h-4 w-4 text-primary" />
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
