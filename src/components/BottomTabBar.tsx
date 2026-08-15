import { NavLink } from "react-router-dom";
import { Map, Heart, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { tap } from "@/lib/haptics";

const tabs: { to: string; label: string; icon: typeof Map; end?: boolean }[] = [
  { to: "/", label: "Kaart", icon: Map, end: true },
  { to: "/favorieten", label: "Favorieten", icon: Heart },
  { to: "/instellingen", label: "Instellingen", icon: Settings },
];

export const BottomTabBar = () => (
  <nav
    className="pb-safe fixed bottom-0 left-0 right-0 z-40 backdrop-blur-2xl"
    style={{
      backgroundColor: "hsl(var(--foreground-deep) / 0.85)",
      borderTop: "1px solid hsl(0 0% 100% / 0.06)",
      boxShadow:
        "0 -12px 32px -8px hsl(230 30% 4% / 0.55), inset 0 1px 0 hsl(0 0% 100% / 0.04)",
    }}
    aria-label="Hoofdnavigatie"
  >
    <ul className="mx-auto flex max-w-md items-stretch justify-around px-3 pb-1.5 pt-1.5">
      {tabs.map(({ to, label, icon: Icon, end }) => (
        <li key={to} className="flex-1">
          <NavLink
            to={to}
            end={end}
            onClick={() => tap()}
            className={({ isActive }) =>
              cn(
                "group relative flex flex-col items-center gap-0.5 rounded-2xl px-2 pb-1 pt-1.5 transition-all duration-300",
                isActive ? "text-primary" : "text-white/55 hover:text-white/85"
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    "absolute top-1 h-7 w-12 rounded-full transition-all duration-300",
                    isActive
                      ? "scale-100 bg-primary/15 opacity-100"
                      : "scale-75 bg-transparent opacity-0"
                  )}
                />
                <Icon
                  className={cn(
                    "relative z-10 h-[22px] w-[22px] transition-transform duration-300",
                    isActive ? "scale-110" : "scale-100"
                  )}
                  strokeWidth={isActive ? 2.4 : 1.9}
                />
                <span
                  className={cn(
                    "relative z-10 text-[10.5px] tracking-tight transition-all",
                    isActive ? "font-bold" : "font-medium"
                  )}
                >
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