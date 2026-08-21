import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check, Star, X, Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { usePremium } from "@/hooks/usePremium";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { tap, success, warning } from "@/lib/haptics";
import { MarketingSuite } from "@/lib/marketing";
import { Logger } from "@/lib/logger";

const features = [
  "Volledige en langere parkeerhistoriek",
  "Meerdere voertuigen en favorieten",
  "Extra timerwaarschuwingen en live widget",
  "PDF-export van je parkeerhistoriek",
  "Premium community-inzichten wanneer beschikbaar",
];

type Plan = "monthly" | "yearly";

const Premium = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    paidActive,
    isTrial,
    daysLeft,
    periodEnd,
    cancelAtPeriodEnd,
    trialEndsAt,
    startTrial,
    cancel,
    openCheckout,
    openPortal,
    refresh,
  } = usePremium();

  const [searchParams, setSearchParams] = useSearchParams();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan>("yearly");
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [trialBusy, setTrialBusy] = useState(false);

  useEffect(() => {
    MarketingSuite.trackEvent("page_view", { page: "premium" });
    Logger.info("SYSTEM", "Premium pricing page viewed.");
  }, []);

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      success();
      MarketingSuite.trackEvent("premium_activated", { source: "stripe" });
      Logger.marketing("CONVERSION", "Premium successfully purchased via Stripe!");
      toast.success("🎉 Premium geactiveerd", {
        description: "Bedankt! Je toegang is direct beschikbaar.",
      });
      refresh();
      const next = new URLSearchParams(searchParams);
      next.delete("checkout");
      next.delete("session_id");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, refresh]);

  const handleStartTrial = async () => {
    if (!user) {
      warning();
      toast.info("Meld je eerst aan om je gratis proefperiode te starten.");
      navigate(`/auth?redirect=${encodeURIComponent("/premium")}`);
      return;
    }
    setTrialBusy(true);
    try {
      await startTrial();
      success();
      MarketingSuite.trackEvent("premium_trial_started");
      Logger.marketing("CONVERSION", "User started a server-side 7-day premium trial");
      toast.success("🎉 7 dagen Premium gestart", {
        description: "Geen betaling nu. Na 7 dagen vervalt Premium automatisch.",
      });
    } catch (e) {
      warning();
      toast.error("Proefperiode kon niet starten", {
        description: e instanceof Error ? e.message : "Probeer opnieuw.",
      });
    } finally {
      setTrialBusy(false);
    }
  };

  const handleCancelTrial = async () => {
    setTrialBusy(true);
    try {
      await cancel();
      tap();
      toast.info("Proefperiode gestopt");
    } catch (e) {
      warning();
      toast.error("Proefperiode kon niet worden gestopt", {
        description: e instanceof Error ? e.message : "Probeer opnieuw.",
      });
    } finally {
      setTrialBusy(false);
    }
  };

  const handleCheckout = async (plan: Plan) => {
    if (!user) {
      warning();
      toast.info("Meld je eerst aan om Premium te activeren.");
      navigate(`/auth?redirect=${encodeURIComponent("/premium")}`);
      return;
    }
    tap();
    setLoadingPlan(plan);
    MarketingSuite.trackEvent("checkout_initiated", { plan });
    Logger.marketing("CONVERSION", `User initiated premium checkout for plan: ${plan}`);
    try {
      const res = await openCheckout(plan);
      if (res?.clientSecret) setClientSecret(res.clientSecret);
    } catch (e) {
      warning();
      toast.error("Checkout kon niet starten", {
        description: e instanceof Error ? e.message : "Probeer opnieuw.",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleOpenPortal = async () => {
    tap();
    setOpeningPortal(true);
    try {
      await openPortal();
    } catch (e) {
      warning();
      toast.error("Portaal kon niet openen", {
        description: e instanceof Error ? e.message : "Probeer opnieuw.",
      });
    } finally {
      setOpeningPortal(false);
    }
  };

  const trialEndDate = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString("nl-BE", { day: "numeric", month: "long" })
    : null;
  const periodEndDate = periodEnd
    ? periodEnd.toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <>
      <PaymentTestModeBanner />
      <div className="-mx-4 min-h-[calc(100dvh-9rem)] bg-background pb-8">
        {/* Donkere header */}
        <header className="bg-deep px-5 pb-10 pt-6 text-white">
          <Link
            to="/instellingen"
            onClick={() => tap()}
            className="-ml-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-semibold text-white/70 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Terug
          </Link>
          <div className="mt-10 flex items-center gap-2">
            <Star className="h-7 w-7 fill-gold text-gold" />
            <h1 className="font-display text-[30px] leading-none sm:text-[34px]">
              Shop&Go Premium
            </h1>
          </div>
          <p className="mt-3 text-[15px] font-medium text-white/70">
            Meer overzicht, waarschuwingen en historiek
          </p>
        </header>

        <div className="px-4 pt-5">
          {paidActive && (
            <div className="mb-4 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3">
              <div className="text-sm font-bold text-primary">
                {cancelAtPeriodEnd ? "Premium loopt af" : "Premium actief"}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {cancelAtPeriodEnd
                  ? `Toegang tot ${periodEndDate ?? "einde periode"}.`
                  : `Volgende verlenging op ${periodEndDate ?? "—"}.`}
              </p>
            </div>
          )}
          {!paidActive && isTrial && (
            <div className="mb-4 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3">
              <div className="text-sm font-bold text-primary">
                Gratis proefperiode actief
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Nog <strong>{daysLeft}</strong> {daysLeft === 1 ? "dag" : "dagen"}
                {trialEndDate ? ` · vervalt op ${trialEndDate}` : ""}.
              </p>
            </div>
          )}

          {/* Voordelenkaart */}
          <section className="card-soft mb-5 overflow-hidden">
            <h2 className="px-4 pb-1 pt-4 text-[12px] font-bold uppercase tracking-wider text-card-foreground">
              Wat krijg je?
            </h2>
            <ul className="divide-y divide-border/40">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-3 px-4 py-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <span className="text-[15px] font-medium text-card-foreground">{f}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Prijsopties */}
          <h2 className="mb-2 px-1 text-[12px] font-bold uppercase tracking-wider text-foreground">
            Kies je abonnement
          </h2>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { tap(); setSelectedPlan("monthly"); }}
              disabled={paidActive}
              className={`rounded-2xl p-4 text-left transition active:scale-[0.98] disabled:opacity-60 ${
                selectedPlan === "monthly"
                  ? "bg-card text-card-foreground ring-2 ring-primary shadow-glow-mint"
                  : "bg-card text-card-foreground ring-1 ring-border/60"
              }`}
            >
              <div className="font-display text-[22px]">€1,99</div>
              <div className="text-xs font-medium text-card-muted">/ maand</div>
            </button>

            <button
              type="button"
              onClick={() => { tap(); setSelectedPlan("yearly"); }}
              disabled={paidActive}
              className={`relative overflow-hidden rounded-2xl p-4 text-left transition active:scale-[0.98] disabled:opacity-60 ${
                selectedPlan === "yearly"
                  ? "bg-primary text-primary-foreground shadow-glow-mint ring-2 ring-primary"
                  : "bg-card text-card-foreground ring-1 ring-border/60"
              }`}
            >
              <div className="font-display text-[22px]">€14,99</div>
              <div className={`text-xs font-medium ${selectedPlan === "yearly" ? "text-white/90" : "text-card-muted"}`}>
                / jaar
              </div>
              <div className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                selectedPlan === "yearly" ? "bg-white/20 text-white" : "bg-primary/15 text-primary"
              }`}>
                Bespaar 37%
              </div>
            </button>
          </div>

          <p className="mb-5 px-1 text-[11px] text-muted-foreground">
            Veilig betalen. Op elk moment opzegbaar. Geen verborgen kosten.
          </p>

          {paidActive ? (
            <button
              type="button"
              onClick={handleOpenPortal}
              disabled={openingPortal}
              className="btn-pill-primary w-full"
            >
              {openingPortal ? <Loader2 className="h-5 w-5 animate-spin" /> : "Beheer abonnement"}
            </button>
          ) : isTrial ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleCheckout(selectedPlan)}
                disabled={loadingPlan !== null}
                className="btn-pill-primary w-full"
              >
                {loadingPlan ? <Loader2 className="h-5 w-5 animate-spin" /> : (<>Activeer Premium <ArrowRight className="h-5 w-5" /></>)}
              </button>
              <button
                type="button"
                onClick={handleCancelTrial}
                disabled={trialBusy}
                className="btn-pill-outline w-full"
              >
                Proefperiode stoppen
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleStartTrial}
                disabled={trialBusy}
                className="btn-pill-primary w-full"
              >
                {trialBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : (<>Start 7 dagen gratis <ArrowRight className="h-5 w-5" /></>)}
              </button>
              <button
                type="button"
                onClick={() => handleCheckout(selectedPlan)}
                disabled={loadingPlan !== null}
                className="btn-pill-outline w-full"
              >
                {loadingPlan ? <Loader2 className="h-5 w-5 animate-spin" /> : (<>Direct betalen ({selectedPlan === "yearly" ? "€14,99/jaar" : "€1,99/maand"})</>)}
              </button>
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-1 text-[12px] text-muted-foreground">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-3.5 w-3.5 fill-gold text-gold" />
            ))}
            <span className="ml-1">Veilig betalen via Stripe · op elk moment opzegbaar</span>
          </div>
        </div>
      </div>

      {clientSecret && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="pb-safe relative w-full max-w-md rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <button
              type="button"
              aria-label="Sluiten"
              onClick={() => { tap(); setClientSecret(null); }}
              className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/80 text-white shadow-lg"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="max-h-[88vh] overflow-y-auto p-2">
              <StripeEmbeddedCheckout
                clientSecret={clientSecret}
                onComplete={() => { success(); setClientSecret(null); refresh(); }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Premium;
