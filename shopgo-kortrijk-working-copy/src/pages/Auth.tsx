import { useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { ArrowRight, LogIn, UserPlus } from "lucide-react";
import { SGLogo } from "@/components/SGLogo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const Auth = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requestedRedirect = params.get("redirect") || "/";
  const redirect = requestedRedirect.startsWith("/") && !requestedRedirect.startsWith("//")
    ? requestedRedirect
    : "/";
  const { user } = useAuth();
  
  useEffect(() => {
    if (user) navigate(redirect, { replace: true });
  }, [user, navigate, redirect]);

  return (
    <div className="min-h-[100dvh] bg-card font-sans text-card-foreground">
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-6 pb-safe pt-safe">
        <div className="flex flex-1 flex-col justify-center py-10">
          <div className="mb-8 flex items-center gap-4 pl-2">
            <SGLogo size={62} className="drop-shadow-[0_5px_14px_hsl(var(--primary)/0.35)]" />
            <div>
              <h1 className="text-3xl font-extrabold leading-none tracking-normal text-card-foreground">
                Shop&Go
              </h1>
              <p className="mt-1 text-[17px] text-muted-foreground">Kortrijk parkeer-reminder</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-deep bg-card px-6 py-6 shadow-elevated">
            <h2 className="text-xl font-extrabold text-card-foreground">Je account, op elk toestel</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Meld aan met Google of maak een account met je e-mailadres. Je parkeerhistoriek en voorkeuren blijven veilig gekoppeld.
            </p>
            <div className="mt-6 space-y-3">
              <Button asChild className="h-[54px] w-full rounded-xl bg-primary text-base font-extrabold text-primary-foreground shadow-glow-mint hover:bg-primary/90">
                <Link to={`/sign-up?redirect_url=${encodeURIComponent(redirect)}`}>
                  <UserPlus className="mr-2 h-5 w-5" /> Account aanmaken
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-[54px] w-full rounded-xl border-slate-300 bg-white text-base font-bold text-slate-800 hover:bg-slate-50">
                <Link to={`/sign-in?redirect_url=${encodeURIComponent(redirect)}`}>
                  <LogIn className="mr-2 h-5 w-5" /> Aanmelden
                </Link>
              </Button>
            </div>
            <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
              In het volgende scherm kies je veilig tussen Google of e-mail.
            </p>
          </div>

          <div className="mt-6 space-y-3 text-center">
            <Link
              to="/"
              className="inline-block text-[17px] font-extrabold text-primary underline-offset-4 hover:underline"
            >
              Doorgaan zonder account →
            </Link>
            <p className="px-2 text-[13px] leading-relaxed text-muted-foreground">
              Een account is alleen nodig voor sync & back-up. Timer, locatie, notitie en foto werken
              ook zonder account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
