import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PageLoader } from "@/components/PageLoader";

const Auth = lazy(() => import("./pages/Auth"));
const Home = lazy(() => import("./pages/Home"));
const ActiveSession = lazy(() => import("./pages/ActiveSession"));
const Cars = lazy(() => import("./pages/Cars"));
const History = lazy(() => import("./pages/History"));
const Zones = lazy(() => import("./pages/Zones"));
const Sync = lazy(() => import("./pages/Sync"));
const Settings = lazy(() => import("./pages/Settings"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Premium = lazy(() => import("./pages/Premium"));
const Profile = lazy(() => import("./pages/Profile"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const ReminderSettings = lazy(() => import("./pages/ReminderSettings"));
const LocationDetail = lazy(() => import("./pages/LocationDetail"));
const Timer = lazy(() => import("./pages/Timer"));
const AiAssistant = lazy(() => import("./pages/AiAssistant"));
const About = lazy(() => import("./pages/About"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Install = lazy(() => import("./pages/Install"));
const NotFound = lazy(() => import("./pages/NotFound"));
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import ScrollToTop from "@/components/ScrollToTop";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" richColors closeButton />
        <BrowserRouter>
          <AuthProvider>
            <ScrollToTop />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/install" element={<Install />} />
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/ai" element={<AiAssistant />} />
                  <Route path="/zones" element={<Zones />} />
                  <Route path="/locatie/:id" element={<LocationDetail />} />
                  <Route path="/timer" element={<Timer />} />
                  <Route path="/favorieten" element={<Favorites />} />
                  <Route path="/historiek" element={<History />} />
                  <Route path="/auto" element={<Cars />} />
                  <Route path="/instellingen" element={<Settings />} />
                  <Route path="/instellingen/waarschuwing" element={<ReminderSettings />} />
                  <Route path="/profiel" element={<Profile />} />
                  <Route path="/premium" element={<Premium />} />
                  <Route path="/over" element={<About />} />
                  <Route path="/privacy" element={<Privacy />} />

                  {/* Legacy aliases keep previously shared links alive. */}
                  <Route path="/session/:id" element={<ActiveSession />} />
                  <Route path="/cars" element={<Cars />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/sync" element={<Sync />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
