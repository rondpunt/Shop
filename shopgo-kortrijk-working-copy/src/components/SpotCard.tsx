import { Star } from "lucide-react";
import { Link } from "react-router-dom";
import type { ParkoZone } from "@/hooks/useParkoLive";
import { driveMin, formatDist, walkMin, zoneStatus, navigateTo } from "@/lib/parko";
import { cn } from "@/lib/utils";

type Props = {
  zone: ParkoZone;
  distanceKm: number | null;
  variant?: "best" | "default" | "horizontal";
  className?: string;
};

const STATUS_BAR_COLOR: Record<string, string> = {
  free: "bg-success",
  warn: "bg-warning",
  full: "bg-destructive",
  unknown: "bg-muted-foreground/30",
};

export const SpotCard = ({ zone, distanceKm, variant = "default", className }: Props) => {
  const status = zoneStatus(zone);
  const pct = zone.totalBays > 0 ? Math.min(100, Math.round((zone.freeBays / zone.totalBays) * 100)) : 0;

  const isBest = variant === "best";
  const isHorizontal = variant === "horizontal";

  return (
    <article
      className={cn(
        "card-soft relative overflow-hidden",
        isBest && "ring-2 ring-primary/30",
        isHorizontal ? "w-[230px] shrink-0 p-3.5" : "p-4",
        className
      )}
    >
      {isBest && (
        <div className="mb-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-gold">
          <Star className="h-3 w-3 fill-current" /> Beste optie
        </div>
      )}

      <Link
        to={`/locatie/${encodeURIComponent(zone.id)}`}
        className="block"
        aria-label={`Details ${zone.name}`}
      >
        <h3 className={cn("truncate font-bold leading-tight text-foreground",
          isBest ? "text-[17px]" : isHorizontal ? "text-[14px]" : "text-[15px]"
        )}>
          {zone.name}
        </h3>
        <div className="mt-1 flex items-baseline gap-1.5 text-xs text-muted-foreground">
          <span><strong className="text-foreground">{zone.freeBays}</strong> vrij</span>
          <span>/ {zone.totalBays} totaal</span>
        </div>

        {/* progress bar */}
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", STATUS_BAR_COLOR[status])}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* meta rows */}
        {distanceKm !== null && (
          <div className="mt-2.5 space-y-0.5">
            <div className="text-[12px] font-semibold text-foreground">
              🚗 {driveMin(distanceKm)} min · {formatDist(distanceKm)}
            </div>
            <div className="text-[11px] font-medium text-muted-foreground">
              🚶 {walkMin(distanceKm)} min stappen
            </div>
          </div>
        )}

        <div className="mt-2 flex items-center gap-1.5">
          <span className="pill pill-free">
            <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot" />
            Live
          </span>
        </div>
      </Link>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          navigateTo(zone);
        }}
        className="btn-pill-primary mt-3 w-full"
        style={{ minHeight: 44 }}
      >
        Navigeer →
      </button>
    </article>
  );
};
