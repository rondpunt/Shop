import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Timer } from "lucide-react";
import { SGLogo } from "@/components/SGLogo";
import { useDataSource } from "@/hooks/useDataSource";
import { useEffect, useState } from "react";
import { formatMMSS } from "@/lib/format";

const HeaderWidget = () => {
  const { activeSession } = useDataSource();
  const [now, setNow] = useState(Date.now());
  const location = useLocation();

  useEffect(() => {
    if (!activeSession) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [activeSession]);

  if (!activeSession) return null;
  // Don't show the widget if we are already on the active session page
  if (location.pathname.startsWith('/session/')) return null;

  const remainingSec = Math.max(0, Math.floor((new Date(activeSession.ends_at).getTime() - now) / 1000));
  const expired = remainingSec <= 0;
  
  return (
    <Link 
      to={`/session/${activeSession.id}`}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold shadow-sm ring-1 ring-white/10 transition-colors ${
        expired ? "bg-destructive text-destructive-foreground animate-pulse-danger" : remainingSec < 300 ? "bg-warning text-warning-foreground" : "bg-primary text-primary-foreground"
      }`}
    >
      <Timer className="h-3.5 w-3.5" />
      <span className="font-display tracking-widest">{formatMMSS(remainingSec)}</span>
    </Link>
  );
};

/**
 * Compact dark header — used as overlay-friendly + on plain pages.
 * Shop&Go monogram logo + brand left, avatar/profile right.
 */
export const AppHeader = ({ floating = false }: { floating?: boolean }) => {
  const { profile, user } = useAuth();
  const initials = (profile?.display_name || user?.email || "?")
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <header
      className={
        floating
          ? "pt-safe absolute left-0 right-0 top-0 z-30 border-b border-white/10 bg-[#071323] text-white shadow-[0_1px_0_rgba(255,255,255,.04)]"
          : "pt-safe sticky top-0 z-30 bg-deep text-white"
      }
    >
      <div className="mx-auto flex h-[4.25rem] max-w-md items-center justify-between gap-2 px-3.5 sm:px-4">
        <Link
          to="/"
          className="brand-lockup flex min-w-0 shrink-0 items-center gap-2 px-0.5 py-1"
          aria-label="Shop&Go Kortrijk"
        >
          <SGLogo size={32} className="logo-mark shrink-0" />
          <div className="flex min-w-0 items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-[15px] font-black tracking-[-0.02em]">Shop&amp;Go</span>
            <span className="hidden text-[11px] font-semibold text-white/65 min-[360px]:inline">Kortrijk</span>
            <span className="hidden rounded-full bg-primary/15 px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-primary ring-1 ring-primary/20 min-[430px]:inline-flex">
              30 min gratis
            </span>
          </div>
        </Link>
        
        <div className="flex-1 flex justify-center">
          <HeaderWidget />
        </div>

        <Link
          to={user ? "/profiel" : "/auth"}
          aria-label={user ? "Profiel" : "Inloggen"}
          className="shrink-0 rounded-full outline-none ring-offset-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {user ? (
            <Avatar className="h-9 w-9 border border-white/20 bg-white/10">
              <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
              <AvatarFallback className="bg-primary text-primary-foreground text-[11px] font-bold">
                {initials || "S"}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-white/10 text-white shadow-soft backdrop-blur hover:bg-white/20">
              <User className="h-[18px] w-[18px]" />
            </div>
          )}
        </Link>
      </div>
    </header>
  );
};
