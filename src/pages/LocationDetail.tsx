import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Heart, Play, X } from "lucide-react";
import { useParkoLive, nearestZone } from "@/hooks/useParkoLive";
import { useFavorites } from "@/hooks/useFavorites";
import { useDataSource } from "@/hooks/useDataSource";
import { driveMin, distKm, formatDist, navigateTo, walkMin, zoneStatus } from "@/lib/parko";
import { SHOPGO_DURATION_SEC } from "@/lib/format";
import { ensureNotificationPermission, scheduleSessionAlarms } from "@/lib/notifications";
import { StartTimerSheet } from "@/components/StartTimerSheet";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getPredictiveAvailability, getPredictionLabel } from "@/lib/predictive";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const LocationDetail = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: parko } = useParkoLive();
  const { isFavorite, toggle } = useFavorites();
  const { activeSession, startSession, cars } = useDataSource();

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showStartSheet, setShowStartSheet] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }, []);

  const decoded = decodeURIComponent(id);
  const zone = parko?.zones.find((z) => z.id === decoded);

  const close = () => navigate(-1);

  if (!parko) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm">
        <div className="card-soft px-6 py-4 text-sm text-muted-foreground">Laden…</div>
      </div>
    );
  }

  if (!zone) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 backdrop-blur-sm" onClick={close}>
        <div className="animate-sheet-in w-full rounded-t-3xl bg-card p-6 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-muted-foreground/30" />
          <div className="text-[15px] font-bold">Locatie niet gevonden</div>
          <button type="button" onClick={close} className="btn-pill-outline mt-4">
            Sluiten
          </button>
        </div>
      </div>
    );
  }

  const status = zoneStatus(zone);
  const pct = zone.totalBays > 0 ? Math.round((zone.freeBays / zone.totalBays) * 100) : 0;
  const d = coords ? distKm(coords, zone) : null;
  const fav = isFavorite(zone.id);

  const confirmStart = async (remindBeforeMin: number) => {
    if (!zone) return;
    setStarting(true);
    try {
      const wantsReminder = remindBeforeMin > 0;
      const granted = wantsReminder ? await ensureNotificationPermission() : false;
      if (wantsReminder && !granted) {
        toast.warning("Meldingen staan uit", {
          description: "Zonder meldingen krijg je geen alarm bij vergrendeld scherm.",
        });
      }
      const startedAt = new Date();
      const endsAt = new Date(startedAt.getTime() + SHOPGO_DURATION_SEC * 1000);
      const matchedZone =
        coords && parko ? nearestZone(parko.zones, coords.lat, coords.lng, 0.15) : null;
      const sessionAddress = matchedZone?.name ?? zone.name;
      const defaultCar = cars.find((c) => c.is_default) ?? cars[0];
      const session = await startSession({
        car_id: defaultCar?.id ?? null,
        started_at: startedAt.toISOString(),
        ends_at: endsAt.toISOString(),
        lat: zone.lat,
        lng: zone.lng,
        address: sessionAddress,
        spot_id: `parko:${zone.id}`,
      });
      if (granted && wantsReminder) {
        await scheduleSessionAlarms({
          sessionId: session.id,
          endsAt,
          remindBeforeMin,
          locationLabel: sessionAddress?.split(",")[0]?.trim(),
        });
      }
      setShowStartSheet(false);
      navigate(`/session/${session.id}`);
    } catch (e: any) {
      toast.error("Kon sessie niet starten", { description: e?.message });
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm" onClick={close}>
      <div
        className="animate-sheet-in pb-safe w-full rounded-t-[32px] bg-card p-5 shadow-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="mx-auto block h-1.5 w-10 rounded-full bg-muted-foreground/30" />
          <button
            type="button"
            onClick={close}
            aria-label="Sluiten"
            className="absolute right-4 top-4 rounded-full bg-muted p-1.5 text-muted-foreground hover:bg-muted/80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h1 className="mt-3 font-display text-[22px] leading-tight">{zone.name}</h1>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-display text-[42px] leading-none text-foreground">
            {zone.freeBays}
          </span>
          <span className="text-base text-muted-foreground">/ {zone.totalBays} vrij</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted/40 ring-1 ring-border/40">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              status === "free" ? "bar-neon" : status === "warn" ? "bg-warning" : status === "full" ? "bg-destructive" : "bg-muted-foreground/30"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-success">
          <span className="dot-neon h-2.5 w-2.5 rounded-full pulse-dot" />
          Live · bijgewerkt {new Date(parko.fetchedAt).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}
        </div>

        {d !== null && (
          <div className="mt-3 rounded-xl bg-muted px-4 py-3">
            <div className="text-[14px] font-semibold text-foreground">
              🚗 {driveMin(d)} min · {formatDist(d)}
            </div>
            <div className="mt-0.5 text-[12px] font-medium text-muted-foreground">
              🚶 {walkMin(d)} min stappen
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => navigateTo(zone)}
          className="btn-pill-primary mt-4 w-full"
        >
          Navigeer →
        </button>
        <button
          type="button"
          disabled={!!activeSession || starting || zone.freeBays === 0}
          onClick={() => setShowStartSheet(true)}
          className="btn-pill-outline mt-2 w-full"
        >
          <Play className="h-4 w-4 fill-current" /> Start 30 min
        </button>
        <button
          type="button"
          onClick={() => {
            const added = toggle({ id: zone.id, name: zone.name, lat: zone.lat, lng: zone.lng });
            toast.success(added ? "Toegevoegd aan favorieten" : "Verwijderd uit favorieten");
          }}
          className={cn(
            "btn-pill-outline mt-2 w-full",
            fav && "bg-primary/10"
          )}
        >
          <Heart className={cn("h-4 w-4", fav && "fill-primary")} /> {fav ? "Favoriet" : "Sla op als favoriet"}
        </button>

        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Shop&Go zone · Gratis · Max 30 min
        </p>
      </div>

      <StartTimerSheet
        open={showStartSheet}
        onClose={() => (starting ? null : setShowStartSheet(false))}
        onConfirm={confirmStart}
        starting={starting}
      />
    </div>
  );
};

export default LocationDetail;
