import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useDataSource } from "@/hooks/useDataSource";
import { useFavorites } from "@/hooks/useFavorites";
import { Heart, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useParkoLive } from "@/hooks/useParkoLive";
import { driveMin, distKm, formatDist, navigateTo, walkMin, zoneStatus } from "@/lib/parko";
import { useEffect, useState } from "react";
import { usePremium } from "@/hooks/usePremium";
import { cn } from "@/lib/utils";
import { FREE_FAVORITES_LIMIT } from "@/lib/premiumLimits";
import { PremiumSoftPrompt } from "@/components/PremiumSoftPrompt";

const FREE_LIMIT = FREE_FAVORITES_LIMIT;

const Favorites = () => {
  const { favorites, remove } = useFavorites();
  const { data: parko } = useParkoLive();
  const { premium } = usePremium();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }, []);

  const enriched = favorites.map((fav) => {
    const live = parko?.zones.find((z) => z.id === fav.id);
    const d = coords ? distKm(coords, fav) : null;
    return { fav, live, d };
  });

  return (
    <div className="app-page-panel">
      <PageHeader title="Mijn favorieten" subtitle={`${favorites.length} opgeslagen`} hideBack />

      {favorites.length === 0 ? (
        <div className="card-soft mt-4 flex flex-col items-center px-5 py-7 text-center">
          <div className="mint-icon-tile mb-3 grid h-14 w-14 place-items-center rounded-full">
            <Heart className="h-6 w-6" strokeWidth={2} />
          </div>
          <div className="text-[16px] font-black leading-tight text-card-foreground">Nog geen favorieten</div>
          <p className="mt-1.5 max-w-xs text-[13px] leading-snug text-muted-foreground/80">
            Tik op het hartje bij een locatie om hem hier op te slaan voor snelle navigatie.
          </p>
          <p className="mt-3 text-[12px] text-muted-foreground/80">
            Gratis: tot {FREE_LIMIT} favorieten · <span className="font-semibold text-gold">✨ Premium</span>: onbeperkt
          </p>
          <Link to="/" className="btn-pill-primary mt-4 min-w-[170px] shadow-glow-neon">
            Zoek een plek <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <>
          {!premium && favorites.length >= FREE_LIMIT && (
            <div className="mb-3">
              <PremiumSoftPrompt
                id="favorites-limit"
                title={`Je hebt ${favorites.length} van ${FREE_LIMIT} favorieten gebruikt`}
                description="Met Premium voeg je onbeperkt favorieten toe en bewaar je je volledige lijst."
              />
            </div>
          )}
          <ul className="space-y-3">
          {enriched.map(({ fav, live, d }, i) => {
            const locked = !premium && i >= FREE_LIMIT;
            const status = live ? zoneStatus(live) : "unknown";
            return (
              <li key={fav.id} className={cn("card-soft p-4", locked && "opacity-60")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-bold">{fav.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {live ? (
                        <>
                          <strong className={cn(
                            status === "free" ? "text-success" : status === "warn" ? "text-warning" : "text-destructive"
                          )}>
                            {live.freeBays} vrij
                          </strong>{" "}
                          / {live.totalBays}
                        </>
                      ) : (
                        "Live data niet beschikbaar"
                      )}
                      {d !== null && (
                        <> · 🚗 {driveMin(d)} min · 🚶 {walkMin(d)} min · {formatDist(d)}</>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(fav.id)}
                    aria-label="Verwijder favoriet"
                    className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {locked ? (
                  <Link to="/premium" className="btn-pill-outline mt-3 w-full">
                    🔒 Upgrade voor onbeperkte favorieten
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigateTo(fav)}
                    className="btn-pill-primary mt-3 w-full"
                    style={{ minHeight: 44 }}
                  >
                    Navigeer →
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        </>
      )}
    </div>
  );
};

export default Favorites;
