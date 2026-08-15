import { NavLink } from "react-router-dom";
import { Heart, History, Map, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { tap } from "@/lib/haptics";

const tabs: { to: string; label: string; icon: typeof Map; end?: boolean }[] = [
  { to: "/", label: "Kaart", icon: Map, end: true },
  { to: "/historiek", label: "Historiek", icon: History },
  { to: "/favorieten", label: "Favorieten", icon: Heart },
  { to: "/instellingen", label: "Meer", icon: Menu },
];

export const BottomTabBar = () => (
  <nav className="pb-safe pointer-events-none fixed bottom-0 left-0 right-0 z-40 px-3 pb-2" aria-label="Hoofdnavigatie">
    <ul
      className="pointer-events-auto mx-auto flex max-w-md items-stretch rounded-[24px] border border-white/[0.08] bg-[#101424]/92 p-1.5 shadow-[0_18px_55px_rgba(0,0,0,.42)] backdrop-blur-2xl"
    >
      {tabs.map(({ to, label, icon: Icon, end }) => (
        <li key={to} className="flex-1">
          <NavLink
            to={to}
            end={end}
            onClick={() => tap()}
            className={({ isActive }) =>
              cn(
                "group relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[18px] px-1 transition-all duration-300",
                isActive ? "text-[#071b17]" : "text-white/48 active:bg-white/[0.06]"
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    "absolute inset-0 transition-all duration-300",
                    isActive
                      ? "scale-100 bg-primary opacity-100 shadow-[0_8px_22px_rgba(0,200,150,.25)]"
                      : "scale-90 bg-transparent opacity-0"
                  )}
                />
                <Icon className={cn("relative z-10 h-[20px] w-[20px] transition-transform", isActive && "scale-105")} strokeWidth={isActive ? 2.6 : 2} />
                <span className={cn("relative z-10 text-[9.5px] tracking-tight", isActive ? "font-extrabold" : "font-semibold")}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  </nav>
);
