import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAppUsage } from "@/hooks/useAppUsage";
import { AppHeader } from "./AppHeader";
import { BottomTabBar } from "./BottomTabBar";
import { RouteLoader } from "./RouteLoader";

/**
 * Two layout modes:
 *  - "fullscreen" pages (Home, Timer): NO AppHeader and NO max-width container — page renders edge-to-edge.
 *  - default pages: header + container + bottom tabs.
 */
const FULLSCREEN_ROUTES = ["/", "/timer"];

export const AppLayout = () => {
  useAppUsage();
  const { pathname } = useLocation();

  const fullscreen = FULLSCREEN_ROUTES.includes(pathname);

  if (fullscreen) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div key={pathname} className="animate-page-in flex-1">
          <Suspense fallback={<RouteLoader />}>
            <Outlet />
          </Suspense>
        </div>
        <BottomTabBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppHeader />
      <main key={pathname} className="pb-safe animate-page-in mx-auto max-w-md px-4 pb-32 pt-4 w-full flex-1">
        <Suspense fallback={<RouteLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <BottomTabBar />
    </div>
  );
};
