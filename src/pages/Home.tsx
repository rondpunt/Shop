import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, Loader2, ChevronDown, ChevronUp, Car } from "lucide-react";
import { useParkoLive, type ParkoZone } from "@/hooks/useParkoLive";
import { useDataSource } from "@/hooks/useDataSource";
import { NearbyMap } from "@/components/NearbyMap";
import { distKm, driveMin, formatDist, navigateTo } from "@/lib/parko";
import { cn } from "@/lib/utils";
import { AppHeader } from "@/components/AppHeader";
import { HomeSessionWidget } from "@/components/HomeSessionWidget";

type SheetState = 0 | 1 | 2;
type ZoneWithDistance = { z: ParkoZone; d: number | null };

const availabilityText = (zone: ParkoZone) => {
  if (zone.freeBays <= 0) return "Geen vrije plaatsen";
  return zone.freeBays === 1 ? "1 vrije plaats" : `${zone.freeBays} vrije plaatsen`;
};

const locationCountText = (count: number) => {
  if (count === 0) return "Geen vrije locaties";
  return count === 1 ? "1 locatie beschikbaar" : `${count} locaties beschikbaar`;
};

const Home = () => {
  const {
    data: parko,
    loading: parkoLoading,
    refreshing: parkoRefreshing,
    error: parkoError,
    refresh: refreshParko,
  } = useParkoLive();
  const { activeSession } = useDataSource();

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address] = useState("Kortrijk centrum");
  const [sheetState, setSheetState] = useState<SheetState>(1);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const touchStartY = useRef(0);
  const touchScrollTop = useRef(0);
  const [dragDelta, setDragDelta] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, []);

  // Best choice: currently free first, then nearest; more free bays break ties.
  // This is a deterministic ranking, not a made-up probability score.
  const sortedZones = useMemo<ZoneWithDistance[]>(() => {
    if (!parko?.zones) return [];
    return parko.zones
      .map((z) => ({ z, d: coords ? distKm(coords, z) : null }))
      .sort((a, b) => {
        const aFree = a.z.freeBays > 0;
        const bFree = b.z.freeBays > 0;
        if (aFree !== bFree) return aFree ? -1 : 1;

        if (a.d !== null && b.d !== null && Math.abs(a.d - b.d) > 0.03) {
          return a.d - b.d;
        }
        if (a.z.freeBays !== b.z.freeBays) return b.z.freeBays - a.z.freeBays;
        if (a.d !== null && b.d !== null) return a.d - b.d;
        return a.z.name.localeCompare(b.z.name, "nl");
      });
  }, [parko?.zones, coords]);

  const bestChoice = sortedZones[0] ?? null;

  useEffect(() => {
    if (!bestChoice) {
      setSelectedZoneId(null);
      return;
    }

    if (!selectedZoneId) {
      setSelectedZoneId(bestChoice.z.id);
      return;
    }

    const selected = sortedZones.find(({ z }) => z.id === selectedZoneId);
    // Respect a manual choice while it is still free. Switch automatically when it becomes full.
    if (!selected || (selected.z.freeBays === 0 && bestChoice.z.freeBays > 0)) {
      setSelectedZoneId(bestChoice.z.id);
    }
  }, [bestChoice, selectedZoneId, sortedZones]);

  const selected = useMemo(() => {
    if (!selectedZoneId) return bestChoice;
    return sortedZones.find(({ z }) => z.id === selectedZoneId) ?? bestChoice;
  }, [bestChoice, selectedZoneId, sortedZones]);

  const freeLocationCount = sortedZones.filter(({ z }) => z.freeBays > 0).length;
  const otherFreeLocations = Math.max(
    0,
    freeLocationCount - (selected?.z.freeBays && selected.z.freeBays > 0 ? 1 : 0),
  );

  const liveLabel = useMemo(() => {
    if (parkoRefreshing) return "Live · bijwerken…";
    if (!parko?.fetchedAt) return "Live";
    const ageSeconds = Math.max(0, Math.floor((now - new Date(parko.fetchedAt).getTime()) / 1_000));
    if (ageSeconds <= 5) return "Live · zojuist vernieuwd";
    if (ageSeconds < 60) return `Live · ${ageSeconds} sec geleden`;
    const minutes = Math.floor(ageSeconds / 60);
    return `Live · ${minutes} min geleden`;
  }, [now, parko?.fetchedAt, parkoRefreshing]);

  const sheetHeight =
    sheetState === 0
      ? "112px"
      : sheetState === 1
        ? "clamp(286px, 38dvh, 322px)"
        : "calc(100dvh - 86px)";

  const mapBottomPadding = sheetState === 0 ? 150 : sheetState === 1 ? 335 : 500;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    const scrollArea = (e.target as HTMLElement).closest(".sheet-scroll-area") as HTMLElement | null;
    touchScrollTop.current = scrollArea?.scrollTop ?? 0;
    setDragging(true);
    setDragDelta(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const raw = e.touches[0].clientY - touchStartY.current;

    // In the fully-open state, upward gestures belong to the list scroll.
    if (sheetState === 2 && (raw < 0 || touchScrollTop.current > 0)) return;

    const clamped =
      sheetState === 0
        ? Math.max(-120, Math.min(0, raw))
        : sheetState === 2
          ? Math.max(0, Math.min(120, raw))
          : Math.max(-120, Math.min(120, raw));
    setDragDelta(clamped);
  };

  const handleTouchEnd = () => {
    if (dragDelta < -45) {
      setSheetState((s) => (s < 2 ? ((s + 1) as SheetState) : s));
    } else if (dragDelta > 45) {
      setSheetState((s) => (s > 0 ? ((s - 1) as SheetState) : s));
    }
    setDragDelta(0);
    setDragging(false);
  };

  const selectZone = (zone: ParkoZone) => {
    setSelectedZoneId(zone.id);
    setSheetState(1);
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-deep">
      <div className="absolute inset-0">
        <NearbyMap
          userCoords={coords}
          zones={parko?.zones ?? []}
          recommendedZoneId={selected?.z.id ?? null}
          onZoneTap={selectZone}
          height="100%"
          showFilters={false}
          initialFilter="all"
          bottomPadding={mapBottomPadding}
        />
      </div>

      <AppHeader floating />

      <div
        className="pt-safe absolute left-0 right-0 z-20 px-3 transition-all duration-300 ease-out"
        style={{
          top: "calc(env(safe-area-inset-top) + 44px)",
          transform: sheetState === 2 ? "translateY(-180%)" : "translateY(0)",
          opacity: sheetState === 2 ? 0 : 1,
          pointerEvents: sheetState === 2 ? "none" : "auto",
        }}
      >
        <div className="mx-auto max-w-md space-y-1.5">
          <Link
            to="/zones"
            className="flex h-[44px] w-full items-center gap-2 rounded-full bg-white/95 px-4 text-sm text-slate-500 shadow-elevated ring-1 ring-black/5 backdrop-blur transition-base hover:text-slate-900"
            aria-label="Zoek een parkeerplek"
          >
            <Search className="h-4 w-4 text-slate-500" strokeWidth={2.5} />
            <span className="text-[14px] font-medium">Waar wil je parkeren?</span>
          </Link>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-semibold text-slate-900 shadow-elevated ring-1 ring-black/5 backdrop-blur">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            {address}
          </div>
        </div>
      </div>

      {activeSession && (
        <HomeSessionWidget
          session={activeSession}
          className="absolute left-3 right-3 z-30 transition-all duration-300 ease-out"
          style={{
            bottom:
              sheetState === 0
                ? "calc(env(safe-area-inset-bottom) + 180px)"
                : "calc(env(safe-area-inset-bottom) + 370px)",
            opacity: sheetState === 2 ? 0 : 1,
            pointerEvents: sheetState === 2 ? "none" : "auto",
          }}
        />
      )}

      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className={cn(
          "pb-safe absolute left-0 right-0 z-20 mx-auto flex max-w-md flex-col rounded-t-[28px] bg-card text-card-foreground shadow-sheet",
          dragging ? "transition-none" : "transition-[height,transform] duration-300 ease-out",
        )}
        style={{
          bottom: "calc(env(safe-area-inset-bottom) + 58px)",
          height: sheetHeight,
          transform: `translateY(${dragDelta}px)`,
        }}
      >
        <button
          type="button"
          onClick={() =>
            setSheetState((s) => (s === 0 ? 1 : s === 1 ? 2 : 1) as SheetState)
          }
          className="mx-auto flex w-full shrink-0 cursor-grab justify-center pb-2 pt-3 active:cursor-grabbing"
          aria-label="Parkeeroverzicht openen of sluiten"
        >
          <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
        </button>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4">
          <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
            <h2 className="min-w-0 truncate text-[20px] font-bold leading-tight text-foreground">
              {freeLocationCount === 0 && !parkoLoading && parko
                ? "Geen vrije Shop&Go"
                : "Vrije Shop&Go"}
            </h2>
            {sheetState > 0 && parko && !parkoLoading && !parkoError && (
              <span className="shrink-0 text-[11px] font-bold text-success">{liveLabel}</span>
            )}
          </div>

          {parkoLoading && !parko ? (
            <div className="flex items-center gap-2 px-1 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Shop&Go laden…
            </div>
          ) : parkoError ? (
            <div className="rounded-2xl bg-muted/60 p-4">
              <div className="text-sm font-bold text-foreground">
                Beschikbaarheid tijdelijk niet beschikbaar
              </div>
              <button
                type="button"
                onClick={() => void refreshParko()}
                disabled={parkoRefreshing}
                className="mt-2 text-xs font-bold text-primary disabled:opacity-60"
              >
                {parkoRefreshing ? "Bijwerken…" : "Probeer opnieuw"}
              </button>
            </div>
          ) : (
            <div className="sheet-scroll-area min-h-0 flex-1 overflow-y-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div
                onClick={() => setSheetState(1)}
                className={cn(
                  "flex h-full cursor-pointer flex-col items-center justify-center transition-opacity duration-200",
                  sheetState === 0 ? "opacity-100" : "hidden pointer-events-none",
                )}
              >
                <div className="text-[15px] font-bold text-foreground">
                  {locationCountText(freeLocationCount)}
                </div>
                <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                  <ChevronUp className="h-3 w-3" /> Veeg omhoog voor beste keuze
                </div>
              </div>

              <div
                className={cn(
                  "flex h-full flex-col transition-opacity duration-200",
                  sheetState === 1 ? "opacity-100" : "hidden pointer-events-none",
                )}
              >
                {freeLocationCount === 0 ? (
                  <div className="rounded-2xl bg-muted/55 p-4">
                    <div className="text-[15px] font-bold text-foreground">
                      Er zijn momenteel geen vrije plaatsen.
                    </div>
                    <div className="mt-1 text-[12px] font-medium text-muted-foreground">
                      Beschikbaarheid wordt live bijgewerkt.
                    </div>
                  </div>
                ) : selected ? (
                  <>
                    <div className="card-soft w-full p-4 text-left">
                      {selected.z.id === bestChoice?.z.id && selected.z.freeBays > 0 && (
                        <div className="mb-1.5 text-[11px] font-bold text-primary">Beste keuze nu</div>
                      )}

                      <div className="text-[19px] font-bold leading-tight text-foreground">
                        {selected.z.name}
                      </div>

                      <div className="mt-2 flex items-center gap-2 text-[14px] font-semibold">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-success" />
                        <span className="text-foreground">{availabilityText(selected.z)}</span>
                      </div>

                      {selected.d !== null && (
                        <div className="mt-1 text-[13px] font-medium text-muted-foreground">
                          {driveMin(selected.d)} min · {formatDist(selected.d)}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => navigateTo(selected.z)}
                        className="mt-4 flex min-h-[46px] w-full items-center justify-center rounded-xl bg-primary px-4 text-[15px] font-bold text-primary-foreground transition-transform active:scale-[0.98]"
                      >
                        Navigeer →
                      </button>
                    </div>

                    <div className="mt-auto flex justify-center pb-1 pt-2">
                      <button
                        type="button"
                        onClick={() => setSheetState(2)}
                        className="flex items-center gap-1 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {otherFreeLocations > 0
                          ? `Nog ${otherFreeLocations} ${otherFreeLocations === 1 ? "locatie" : "locaties"}`
                          : "Bekijk alle locaties"}
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                  </>
                ) : null}
              </div>

              <div
                className={cn(
                  "flex flex-col gap-2.5 transition-opacity duration-200",
                  sheetState === 2 ? "opacity-100" : "hidden pointer-events-none",
                )}
              >
                {sortedZones.map(({ z, d }, idx) => {
                  const isSelected = z.id === selectedZoneId;
                  const isBest = idx === 0 && z.freeBays > 0;
                  return (
                    <div
                      key={z.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => selectZone(z)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") selectZone(z);
                      }}
                      className={cn(
                        "card-soft flex w-full items-center gap-3 p-3.5 text-left transition-all active:scale-[0.99]",
                        isSelected && "ring-1 ring-primary/50",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        {isBest && (
                          <div className="mb-1 text-[10.5px] font-bold text-primary">Beste keuze nu</div>
                        )}
                        <div className="truncate text-[15px] font-bold text-foreground">{z.name}</div>
                        <div className="mt-1 flex items-center gap-2 text-[12.5px] font-semibold">
                          <span
                            className={cn(
                              "h-2.5 w-2.5 shrink-0 rounded-full",
                              z.freeBays > 0 ? "bg-success" : "bg-muted-foreground/55",
                            )}
                          />
                          <span className={z.freeBays > 0 ? "text-foreground" : "text-muted-foreground"}>
                            {availabilityText(z)}
                          </span>
                        </div>
                        {d !== null && (
                          <div className="mt-0.5 text-[12px] font-medium text-muted-foreground">
                            {driveMin(d)} min · {formatDist(d)}
                          </div>
                        )}
                      </div>

                      {z.freeBays > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateTo(z);
                          }}
                          className="shrink-0 rounded-xl bg-primary px-3 py-2.5 text-[12px] font-bold text-primary-foreground transition-transform active:scale-[0.98]"
                        >
                          Navigeer →
                        </button>
                      )}
                    </div>
                  );
                })}

                {sortedZones.length > 0 && (
                  <div className="px-2 pb-2 pt-1 text-center text-[11px] font-medium text-muted-foreground">
                    Beschikbaarheid verandert continu. Controleer voor vertrek de actuele status.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;