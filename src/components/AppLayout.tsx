import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAppUsage } from "@/hooks/useAppUsage";
import { AppHeader } from "./AppHeader";
import { BottomTabBar } from "./BottomTabBar";
import { RouteLoader } from "./RouteLoader";

const FULLSCREEN_ROUTES = ["/", "/timer"];

export const AppLayout = () => {
  useAppUsage();
  const { pathname } = useLocation();
  const fullscreen = FULLSCREEN_ROUTES.includes(pathname) || pathname.startsWith("/session/");

  if (fullscreen) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-background">
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
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <AppHeader />
      <main key={pathname} className="pb-safe animate-page-in mx-auto w-full max-w-md flex-1 px-4 pb-32 pt-4">
        <Suspense fallback={<RouteLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <BottomTabBar />
    </div>
  );
};
