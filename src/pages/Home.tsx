import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, MapPin, Loader2, ChevronDown, ChevronUp, ChevronRight, Car, Navigation } from "lucide-react";
import { useParkoLive, type ParkoZone } from "@/hooks/useParkoLive";
import { useDataSource } from "@/hooks/useDataSource";
import { NearbyMap } from "@/components/NearbyMap";
import { distKm, driveMin, formatDist, navigateTo } from "@/lib/parko";
import { cn } from "@/lib/utils";
import { AppHeader } from "@/components/AppHeader";
import { HomeSessionWidget } from "@/components/HomeSessionWidget";
import { ZoneIntelligence } from "@/components/ZoneIntelligence";
import { StartTimerSheet } from "@/components/StartTimerSheet";
import { ensureNotificationPermission, scheduleSessionAlarms } from "@/lib/notifications";
import { SHOPGO_DURATION_SEC } from "@/lib/format";
import { toast } from "sonner";
import { useReminderPref } from "@/hooks/useReminderPref";
import { Logger } from "@/lib/logger";

const KORTRIJK_CENTER = { lat: 50.8276, lng: 3.2659 };

type SheetState = 0 | 1 | 2;

const Home = () => {
  const navigate = useNavigate();
  const { data: parko, loading: parkoLoading, error: parkoError } = useParkoLive();
  const { activeSession, startSession, cars } = useDataSource();
  const { prefs } = useReminderPref();

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("Kortrijk centrum");

  // Sheet states
  const [sheetState, setSheetState] = useState<SheetState>(1);
  const sheetRef = useRef<HTMLDivElement>(null);

  const [showStartSheet, setShowStartSheet] = useState(false);
  const [starting, setStarting] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  // Get user location
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }, []);

  // Compute sorted zones
  const sortedZones = useMemo(() => {
    if (!parko?.zones) return [];
    return parko.zones
      .map((z) => ({ z, d: coords ? distKm(coords, z) : null }))
      .sort((a, b) => {
        // Only free spots
        if (a.z.freeBays === 0 && b.z.freeBays > 0) return 1;
        if (b.z.freeBays === 0 && a.z.freeBays > 0) return -1;
        if (a.d === null || b.d === null) return b.z.freeBays - a.z.freeBays;
        return a.d - b.d;
      });
  }, [parko?.zones, coords]);

  // Set default selected zone to the best one on load or when data changes
  useEffect(() => {
    if (sortedZones.length > 0 && !selectedZoneId && parko) {
      setSelectedZoneId(sortedZones[0].z.id);
    } else if (sortedZones.length > 0 && selectedZoneId) {
       const currentSelected = sortedZones.find(s => s.z.id === selectedZoneId);
       if (currentSelected && currentSelected.z.freeBays === 0 && sortedZones[0].z.freeBays > 0) {
         setSelectedZoneId(sortedZones[0].z.id);
       }
    }
  }, [sortedZones, selectedZoneId, parko]);

  const recommended = useMemo(() => {
    if (selectedZoneId) {
       return sortedZones.find(s => s.z.id === selectedZoneId) || sortedZones[0];
    }
    return sortedZones[0];
  }, [sortedZones, selectedZoneId]);

  // Handle Touch for Sheet Dragging
  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const delta = touchEndY - touchStartY.current;
    
    // Check if we are scrolling inside the list
    const target = e.target as HTMLElement;
    const scrollContainer = target.closest('.sheet-scroll-area');
    if (scrollContainer && scrollContainer.scrollTop > 0 && delta > 0) {
      return; // let native scroll happen
    }

    if (delta < -40) {
      // swipe up
      setSheetState(s => (s < 2 ? (s + 1) as SheetState : s));
    } else if (delta > 40) {
      // swipe down
      setSheetState(s => (s > 0 ? (s - 1) as SheetState : s));
    }
  };

  const confirmStart = async (remindBeforeMin: number) => {
    if (!recommended) return;
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
      const sessionAddress = recommended.z.name;
      const defaultCar = cars.find((c) => c.is_default) ?? cars[0];

      const session = await startSession({
        car_id: defaultCar?.id ?? null,
        started_at: startedAt.toISOString(),
        ends_at: endsAt.toISOString(),
        lat: recommended.z.lat,
        lng: recommended.z.lng,
        address: sessionAddress,
        spot_id: `parko:${recommended.z.id}`,
      });

      if (granted && wantsReminder) {
        await scheduleSessionAlarms({
          sessionId: session.id,
          endsAt,
          remindBeforeMin,
          locationLabel: sessionAddress?.split(",")[0]?.trim(),
        });
      }

      Logger.info("TIMER", `Timer session ${session.id} started successfully`, { address: sessionAddress });
      setShowStartSheet(false);
      navigate(`/session/${session.id}`);
    } catch (e: any) {
      toast.error("Kon sessie niet starten", { description: e?.message });
    } finally {
      setStarting(false);
    }
  };

  const freeCount = sortedZones.filter(z => z.z.freeBays > 0).length;
  
  const fetchedLabel = parko?.fetchedAt 
    ? new Date(parko.fetchedAt).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) 
    : "";

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-deep">
      {/* Fullscreen map */}
      <div className="absolute inset-0">
        <NearbyMap
          userCoords={coords}
          zones={parko?.zones ?? []}
          recommendedZoneId={recommended?.z.id ?? null}
          onZoneTap={(z) => {
            setSelectedZoneId(z.id);
            setSheetState(1); // half open when selecting a marker
          }}
          height="100%"
          showFilters={false}
        />
      </div>

      {/* Floating header */}
      <AppHeader floating />

      {/* Search bar + chip */}
      <div className="pt-safe absolute left-0 right-0 z-20 px-3 transition-transform duration-300 ease-out" 
           style={{ 
             top: "calc(env(safe-area-inset-top) + 44px)",
             transform: sheetState === 2 ? "translateY(-200%)" : "translateY(0)",
             opacity: sheetState === 2 ? 0 : 1,
             pointerEvents: sheetState === 2 ? 'none' : 'auto'
           }}>
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

      {/* Active-session sticky banner */}
      {activeSession && (
        <HomeSessionWidget 
          session={activeSession}
          className="absolute left-3 right-3 z-30 transition-all duration-300 ease-out"
          style={{ 
            bottom: sheetState === 0 ? "150px" : sheetState === 1 ? "350px" : "calc(100dvh - 100px)",
            opacity: sheetState === 2 ? 0 : 1,
            pointerEvents: sheetState === 2 ? 'none' : 'auto'
          }}
        />
      )}

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="pb-safe absolute left-0 right-0 z-20 mx-auto max-w-md rounded-t-[28px] bg-card text-card-foreground shadow-sheet transition-all duration-300 ease-out flex flex-col"
        style={{
          bottom: "calc(env(safe-area-inset-bottom) + 72px)",
          height: sheetState === 0 ? "140px" : sheetState === 1 ? "390px" : "calc(100dvh - 92px)",
        }}
      >
        {/* Drag handle */}
        <button 
          onClick={() => setSheetState(s => (s < 2 ? (s + 1) as SheetState : 1))}
          className="mx-auto w-full pt-3 pb-2 flex justify-center shrink-0 cursor-grab active:cursor-grabbing"
          aria-label="Toggle sheet"
        >
          <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
        </button>

        {/* Content wrapper */}
        <div className="flex flex-col flex-1 overflow-hidden px-4">
          
          {/* Header Row */}
          <div className="flex items-center justify-between shrink-0 mb-3">
            <h2 className="text-[20px] font-bold leading-tight text-foreground">
              {freeCount === 0 && !parkoLoading && parko ? "Geen vrije Shop&Go" : "Vrije Shop&Go"}
            </h2>
            {sheetState > 0 && parko && !parkoLoading && !parkoError && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-success">
                Live · {fetchedLabel || "zojuist"} <span className="h-2 w-2 rounded-full bg-success pulse-dot" />
              </span>
            )}
          </div>

          {/* Body */}
          {parkoLoading && !parko ? (
            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Shop&Go laden…
            </div>
          ) : parkoError ? (
            <div className="text-center p-4">
              <div className="text-sm font-bold text-destructive">Beschikbaarheid tijdelijk niet beschikbaar</div>
              <button onClick={() => window.location.reload()} className="text-xs text-muted-foreground mt-1 underline">Probeer opnieuw</button>
            </div>
          ) : (
            <div className="sheet-scroll-area flex-1 overflow-y-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              
              {/* STATE 0: Collapsed - just summary */}
              <div className={cn("transition-opacity duration-200 text-center flex flex-col h-full", sheetState === 0 ? "opacity-100" : "hidden pointer-events-none")}>
                <div className="flex items-center justify-center gap-2 text-[15px] font-bold text-foreground">
                  <Car className="h-4 w-4 text-primary" /> {freeCount === 0 ? `0 van ${parko?.totalBays ?? 0} plaatsen vrij` : `${parko?.totalFree ?? 0} van ${parko?.totalBays ?? 0} plaatsen vrij`}
                </div>
                <div className="mt-2 text-[11px] font-semibold text-muted-foreground flex items-center justify-center gap-1">
                  <ChevronUp className="h-3 w-3" /> Veeg omhoog voor meer ({freeCount} actieve locaties)
                </div>
              </div>

              {/* STATE 1: Half open - Best location card */}
              <div className={cn("transition-opacity duration-200 flex flex-col h-full", sheetState === 1 ? "opacity-100" : "hidden pointer-events-none")}>
                {recommended ? (
                  <>
                    <div className="best-map-card rounded-[24px] p-4 w-full text-left relative">
                      {recommended.z.freeBays > 0 && (
                        <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                          Beste keuze nu
                        </div>
                      )}
                      <div className="text-[18px] font-bold leading-tight">{recommended.z.name}</div>
                      
                      <div className="mt-2 flex items-center gap-2 text-[14px] font-semibold">
                        <span className={cn("h-3 w-3 rounded-full shrink-0", recommended.z.freeBays > 0 ? "bg-success pulse-dot" : "bg-destructive")} />
                        <span className={recommended.z.freeBays > 0 ? "text-foreground" : "text-destructive"}>
                          {recommended.z.freeBays > 0 
                            ? `${recommended.z.freeBays} van ${recommended.z.totalBays} plaatsen vrij` 
                            : `0 van ${recommended.z.totalBays} plaatsen vrij (Vol)`}
                        </span>
                      </div>
                      
                      {recommended.d !== null && (
                        <div className="mt-1 flex items-center gap-1 text-[13px] text-muted-foreground font-medium">
                          <Car className="h-3.5 w-3.5" /> {driveMin(recommended.d)} min · {formatDist(recommended.d)}
                        </div>
                      )}

                      <ZoneIntelligence
                        spotId={`parko:${recommended.z.id}`}
                        freeBays={recommended.z.freeBays}
                        totalBays={recommended.z.totalBays}
                        compact
                      />

                      <div className="mt-4 grid grid-cols-[0.85fr_1.35fr] gap-2">
                        <button
                          type="button"
                          onClick={() => navigateTo(recommended.z)}
                          className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-[13px] font-extrabold text-slate-700 active:scale-[0.98]"
                        >
                          <Navigation className="h-4 w-4" /> Route
                        </button>
                        <button
                          type="button"
                          onClick={() => activeSession ? toast.info("Er loopt al een sessie") : setShowStartSheet(true)}
                          disabled={starting || recommended.z.freeBays === 0}
                          className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-primary px-3 text-[14px] font-extrabold text-primary-foreground shadow-glow-mint transition active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
                        >
                          {starting ? <Loader2 className="h-5 w-5 animate-spin" /> : recommended.z.freeBays > 0 ? "Ik sta hier · start 30 min" : "Nu vol"}
                        </button>
                      </div>
                    </div>

                    <div className="mt-auto pt-3 flex justify-center pb-2">
                      <button 
                        onClick={() => setSheetState(2)}
                        className="flex items-center gap-1 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Nog {Math.max(0, sortedZones.length - 1)} locaties <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-sm text-muted-foreground p-4">Geen locaties gevonden</div>
                )}
              </div>

              {/* STATE 2: Fully open - List of all locations */}
              <div className={cn("transition-opacity duration-200 flex flex-col gap-3", sheetState === 2 ? "opacity-100" : "hidden pointer-events-none")}>
                {sortedZones.length > 0 && (
                  <div className="text-[11px] font-medium text-muted-foreground text-center mb-1">
                    Beschikbaarheid verandert continu. <br/>
                    Controleer de actuele beschikbaarheid voordat je vertrekt.
                  </div>
                )}
                {sortedZones.map(({ z, d }, idx) => (
                  <button
                    key={`${z.id}-${idx}`}
                    onClick={() => {
                      setSelectedZoneId(z.id);
                      setSheetState(1); // Go back to half open on selection
                    }}
                    className={cn(
                      "card-soft flex w-full flex-row items-center justify-between p-4 text-left transition-base active:scale-[0.99]",
                      z.id === selectedZoneId && "ring-2 ring-primary/40 shadow-glow-mint"
                    )}
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      {idx === 0 && z.freeBays > 0 && (
                         <div className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                           Beste keuze nu
                         </div>
                      )}
                      <div className="text-[15px] font-bold truncate">{z.name}</div>
                      <div className="mt-1.5 flex items-center gap-2 text-[13px] font-semibold">
                        <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", z.freeBays > 0 ? "bg-success" : "bg-destructive")} />
                        <span className={z.freeBays > 0 ? "text-foreground" : "text-destructive"}>
                          {z.freeBays > 0 
                            ? `${z.freeBays} van ${z.totalBays} plaatsen vrij` 
                            : `0 van ${z.totalBays} plaatsen vrij (Vol)`}
                        </span>
                      </div>
                      {d !== null && (
                        <div className="mt-1 flex items-center gap-1 text-[12px] text-muted-foreground font-medium">
                          <Car className="h-3 w-3" /> {driveMin(d)} min · {formatDist(d)}
                        </div>
                      )}
                    </div>
                    {z.freeBays > 0 && (
                       <div className="flex h-[36px] items-center justify-center gap-1 rounded-xl bg-primary px-3 text-[12px] font-bold text-primary-foreground shrink-0 shadow-glow-mint">
                         Bekijk <ChevronRight className="h-3 w-3" />
                       </div>
                    )}
                  </button>
                ))}
              </div>

            </div>
          )}
        </div>
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

export default Home;
