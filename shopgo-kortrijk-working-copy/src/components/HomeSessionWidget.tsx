import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Check, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMMSS, getTimerState } from "@/lib/format";
import { useDataSource, type Session } from "@/hooks/useDataSource";
import { tap } from "@/lib/haptics";

interface HomeSessionWidgetProps {
  session: Session;
  className?: string;
  style?: React.CSSProperties;
}

export const HomeSessionWidget = ({ session, className, style }: HomeSessionWidgetProps) => {
  const navigate = useNavigate();
  const { endSession } = useDataSource();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const remainingSec = Math.max(0, Math.floor((new Date(session.ends_at).getTime() - Date.now()) / 1000));
  const timerState = getTimerState(remainingSec);

  const handleComplete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    tap();
    await endSession(session.id);
  };

  return (
    <div
      onClick={() => navigate(`/session/${session.id}`)}
      role="button"
      className={cn(
        "flex flex-col rounded-2xl px-4 py-3 text-white shadow-elevated transition-base",
        timerState === "danger" || timerState === "expired"
          ? "bg-destructive"
          : timerState === "warning-5"
          ? "bg-warning"
          : "bg-deep",
        className
      )}
      style={style}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
            ⏱ Sessie actief
          </div>
          <div className={cn(
            "font-display text-[26px] leading-none mt-1",
            (timerState === "danger" || timerState === "expired") && "animate-pulse-danger"
          )}>
            nog {formatMMSS(remainingSec)}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 opacity-70" />
      </div>

      <div className="flex items-center gap-2 mt-1">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            tap();
            navigate(`/session/${session.id}`);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 py-2.5 text-[13px] font-semibold transition-colors"
        >
          <Clock3 className="h-4 w-4" />
          Bekijk timer
        </button>
        <button
          onClick={handleComplete}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 py-2.5 text-[13px] font-semibold transition-colors"
        >
          <Check className="h-4 w-4" />
          Beëindigen
        </button>
      </div>
    </div>
  );
};
