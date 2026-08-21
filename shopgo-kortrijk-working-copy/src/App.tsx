import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import { ClerkProvider, SignIn, SignUp } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
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

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const clerkAppearance = {
  theme: "simple" as const,
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: "/",
    logoImageUrl: `${window.location.origin}/logo.svg`,
    socialButtonsPlacement: "top" as const,
  },
  variables: {
    colorPrimary: "#00c896",
    colorForeground: "#111827",
    colorMutedForeground: "#607089",
    colorBackground: "#ffffff",
    colorInput: "#f6f8fb",
    colorInputForeground: "#111827",
    colorDanger: "#ef476f",
    colorNeutral: "#d9e0ea",
    fontFamily: "Inter, system-ui, sans-serif",
    borderRadius: "16px",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "w-[440px] max-w-full overflow-hidden rounded-[28px] bg-white shadow-2xl",
    card: "!rounded-none !border-0 !bg-transparent !shadow-none",
    footer: "!border-0 !bg-transparent !shadow-none",
    headerTitle: "text-slate-900",
    headerSubtitle: "text-slate-500",
    socialButtonsBlockButtonText: "text-slate-800",
    formFieldLabel: "text-slate-700",
    footerActionLink: "text-emerald-600",
    footerActionText: "text-slate-500",
    dividerText: "text-slate-400",
    formButtonPrimary: "bg-emerald-500 hover:bg-emerald-600",
    formFieldInput: "bg-slate-50 text-slate-900",
    socialButtonsBlockButton: "border-slate-200",
  },
};

function ClerkProviderWithRouter({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      localization={{
        signIn: {
          start: {
            title: "Welkom terug",
            subtitle: "Meld je aan bij Shop&Go",
          },
        },
        signUp: {
          start: {
            title: "Maak je account",
            subtitle: "Bewaar je parkeerervaring veilig",
          },
        },
      }}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
    >
      {children}
    </ClerkProvider>
  );
}

function ClerkScreen({ mode }: { mode: "sign-in" | "sign-up" }) {
  const content =
    mode === "sign-in" ? (
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    ) : (
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    );
  return <div className="flex min-h-[100dvh] items-center justify-center bg-deep px-4 py-8">{content}</div>;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" richColors closeButton />
        <BrowserRouter>
          <ClerkProviderWithRouter>
            <AuthProvider>
              <ScrollToTop />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/sign-in/*" element={<ClerkScreen mode="sign-in" />} />
                  <Route path="/sign-up/*" element={<ClerkScreen mode="sign-up" />} />
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
          </ClerkProviderWithRouter>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
