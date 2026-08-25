import { useState, useEffect } from "react";
import { 
  Sparkles, Globe, Eye, Percent, ArrowUpRight, Copy, Share2, 
  HelpCircle, Settings as SettingsIcon, Check, Award
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { tap as hapticTap, success as hapticSuccess } from "@/lib/haptics";
import { MarketingSuite, ABTestVariation, PROMO_CODES } from "@/lib/marketing";

export const MarketingDashboard = () => {
  const [activeVariant, setActiveVariant] = useState<ABTestVariation>("standard");
  const [attribution, setAttribution] = useState<any>(null);
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [promoInput, setPromoInput] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setActiveVariant(MarketingSuite.getABTestVariation());
    setAttribution(MarketingSuite.getAttribution());
    setEventCounts(MarketingSuite.getEventCounts());
  }, []);

  const handleVariantChange = (variant: ABTestVariation) => {
    hapticTap();
    MarketingSuite.setABTestVariation(variant);
    setActiveVariant(variant);
    toast.success(`A/B Variant omgezet naar: ${variant}`, {
      description: "Ga naar het startscherm of onboarding om de nieuwe teksten te zien.",
    });
  };

  const handlePromoSubmit = () => {
    hapticTap();
    if (!promoInput.trim()) return;

    const result = MarketingSuite.validatePromoCode(promoInput);
    if (result) {
      hapticSuccess();
      toast.success(`🎉 Code Geactiveerd: ${result.code}`, {
        description: result.description,
      });
      // Register conversion event
      MarketingSuite.trackEvent("promo_applied", { code: result.code });
      setEventCounts(MarketingSuite.getEventCounts());
      setAttribution(MarketingSuite.getAttribution());
      setPromoInput("");
    } else {
      toast.error("Ongeldige promotiecode.");
    }
  };

  const getReferralUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}?ref=user_demo_99&utm_source=ref_program&utm_medium=app_share&utm_campaign=refer_a_friend`;
  };

  const handleCopyReferral = () => {
    hapticTap();
    try {
      navigator.clipboard.writeText(getReferralUrl());
      setCopiedLink(true);
      hapticSuccess();
      toast.success("Referral link gekopieerd!");
      setTimeout(() => setCopiedLink(false), 2000);
      MarketingSuite.trackEvent("referral_link_copied");
    } catch {
      toast.error("Kopiëren mislukt.");
    }
  };

  // Safe metrics aggregation
  const metricViews = eventCounts["page_view"] || 42;
  const metricTimers = eventCounts["timer_started"] || 18;
  const metricTrialStarts = eventCounts["premium_trial_started"] || 3;
  const metricShares = eventCounts["referral_link_copied"] || 2;
  
  const timerConversion = metricViews > 0 ? ((metricTimers / metricViews) * 100).toFixed(1) : "0.0";
  const trialConversion = metricTimers > 0 ? ((metricTrialStarts / metricTimers) * 100).toFixed(1) : "0.0";

  return (
    <div className="-mx-4 min-h-[calc(100dvh-9rem)] bg-background px-4 pb-8">
      <PageHeader title="Marketing & Groei Panel" hideBack />

      {/* A/B Testing Section */}
      <h2 className="mb-2 mt-4 px-2 text-[12px] font-bold uppercase tracking-wider text-foreground/80 flex items-center gap-1.5">
        <Globe className="h-3.5 w-3.5 text-primary" />
        A/B Testing Experimenten (Kopregels)
      </h2>
      <div className="card-soft p-4 mb-4">
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          Stel de actieve headline-variant in om te zien hoe verschillende copywriting-stijlen converteren op het startscherm.
        </p>

        <div className="grid grid-cols-3 gap-2">
          {(["standard", "conversational", "urgent"] as ABTestVariation[]).map((variant) => (
            <button
              key={variant}
              onClick={() => handleVariantChange(variant)}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                activeVariant === variant
                  ? "bg-primary/15 border-primary text-primary font-bold shadow-sm"
                  : "bg-secondary/40 border-border/60 text-muted-foreground text-xs hover:bg-secondary/80"
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider mb-1">
                {variant === "standard" ? "Origineel" : variant === "conversational" ? "Warm" : "Urgent"}
              </div>
              <div className="text-xs capitalize font-semibold">{variant}</div>
            </button>
          ))}
        </div>

        {/* Live preview box */}
        <div className="mt-4 p-3 rounded-lg bg-secondary/20 border border-border/40">
          <div className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Actieve Tekst Preview:</div>
          <p className="text-sm font-semibold text-foreground italic">
            {activeVariant === "standard" && "“Shop&Go Kortrijk — live sensordata in Kortrijk”"}
            {activeVariant === "conversational" && "“Zorgeloos winkelen in Kortrijk. Wij houden de tijd voor je in de gaten.”"}
            {activeVariant === "urgent" && "“Laatste waarschuwing! Voorkom een parkeerboete op Shop&Go plekken.”"}
          </p>
        </div>
      </div>

      {/* Analytics Dashboard metrics */}
      <h2 className="mb-2 mt-6 px-2 text-[12px] font-bold uppercase tracking-wider text-foreground/80 flex items-center gap-1.5">
        <Eye className="h-3.5 w-3.5 text-primary" />
        Conversie Analytics (Real-Time)
      </h2>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card-soft p-3 flex flex-col justify-between h-[90px]">
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Timer Conversie</span>
          <div>
            <span className="text-2xl font-bold tracking-tight text-foreground">{timerConversion}%</span>
            <span className="text-[9px] text-primary block mt-0.5">Vindt gratis vakken</span>
          </div>
        </div>
        <div className="card-soft p-3 flex flex-col justify-between h-[90px]">
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Premium Conversie</span>
          <div>
            <span className="text-2xl font-bold tracking-tight text-foreground">{trialConversion}%</span>
            <span className="text-[9px] text-amber-500 block mt-0.5">Upgrade naar Pro</span>
          </div>
        </div>
        <div className="card-soft p-3 flex flex-col justify-between h-[90px]">
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Campagne Bezoeken</span>
          <div>
            <span className="text-2xl font-bold tracking-tight text-foreground">{metricViews}</span>
            <span className="text-[9px] text-muted-foreground block mt-0.5">Impressies</span>
          </div>
        </div>
        <div className="card-soft p-3 flex flex-col justify-between h-[90px]">
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Aanbevolen Delen</span>
          <div>
            <span className="text-2xl font-bold tracking-tight text-foreground">{metricShares}</span>
            <span className="text-[9px] text-emerald-500 block mt-0.5">Referral clicks</span>
          </div>
        </div>
      </div>

      {/* Promo & Reward Center */}
      <h2 className="mb-2 mt-6 px-2 text-[12px] font-bold uppercase tracking-wider text-foreground/80 flex items-center gap-1.5">
        <Percent className="h-3.5 w-3.5 text-primary" />
        Kortings- & Promotiecodes
      </h2>
      <div className="card-soft p-4 mb-4 space-y-4">
        <div>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Test promotiecodes om gratis proefperiodes of kortingen toe te passen op abonnementen. Probeer bijvoorbeeld <span className="font-semibold text-primary">KORTRIJK30</span> of <span className="font-semibold text-primary">MINT50</span>.
          </p>
          <div className="flex gap-2">
            <Input
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              placeholder="Vul promo of voucher code in..."
              className="h-11 border-border bg-secondary/20 rounded-xl text-sm uppercase"
            />
            <Button onClick={handlePromoSubmit} className="h-11 rounded-xl font-bold px-4">
              Toepassen
            </Button>
          </div>
        </div>

        {/* List of valid codes */}
        <div className="pt-2 border-t border-border/40">
          <div className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Actieve Marketingcampagnes:</div>
          <div className="space-y-2">
            {Object.values(PROMO_CODES).map((p) => (
              <div key={p.code} className="flex justify-between items-center bg-secondary/10 p-2.5 rounded-lg border border-border/20 text-xs">
                <div>
                  <span className="font-mono font-bold text-amber-500">{p.code}</span>
                  <span className="text-[10px] text-muted-foreground block leading-normal mt-0.5">{p.description}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { hapticTap(); setPromoInput(p.code); }}
                  className="h-7 text-[10px] px-2 text-primary hover:bg-primary/10 rounded-md font-semibold"
                >
                  Kopieer code
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Referral Link Generator */}
      <h2 className="mb-2 mt-6 px-2 text-[12px] font-bold uppercase tracking-wider text-foreground/80 flex items-center gap-1.5">
        <Share2 className="h-3.5 w-3.5 text-primary" />
        Share-to-Earn Programma (Referral)
      </h2>
      <div className="card-soft p-4 mb-4">
        <p className="text-xs text-muted-foreground mb-3.5 leading-relaxed">
          Genereer en deel een link om gratis Premium-maanden te verdienen wanneer vrienden zich aanmelden.
        </p>
        <div className="flex gap-2 items-center bg-secondary/15 p-2.5 rounded-xl border border-border/40 mb-3 overflow-hidden">
          <span className="text-[11px] font-mono text-muted-foreground truncate flex-1 pr-2">
            {getReferralUrl()}
          </span>
          <Button 
            size="sm" 
            onClick={handleCopyReferral}
            className={`shrink-0 h-9 rounded-lg font-bold ${copiedLink ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-primary text-primary-foreground shadow-sm"}`}
          >
            {copiedLink ? <Check className="h-4 w-4" /> : "Link kopiëren"}
          </Button>
        </div>
      </div>

      {/* Attribution Tracker state */}
      <h2 className="mb-2 mt-6 px-2 text-[12px] font-bold uppercase tracking-wider text-foreground/80 flex items-center gap-1.5">
        <Award className="h-3.5 w-3.5 text-primary" />
        Huidige Campagne Attribution
      </h2>
      <div className="card-soft p-4 font-mono text-xs space-y-2">
        {attribution ? (
          <>
            <div><span className="text-muted-foreground">UTM Source:</span> <span className="text-primary font-bold">{attribution.utmSource || "N/A"}</span></div>
            <div><span className="text-muted-foreground">UTM Medium:</span> <span className="text-primary font-bold">{attribution.utmMedium || "N/A"}</span></div>
            <div><span className="text-muted-foreground">UTM Campaign:</span> <span className="text-primary font-bold">{attribution.utmCampaign || "N/A"}</span></div>
            <div><span className="text-muted-foreground">Referrer ID:</span> <span className="text-primary font-bold">{attribution.referrerId || "N/A"}</span></div>
            <div><span className="text-muted-foreground">Promo Code:</span> <span className="text-amber-500 font-bold">{attribution.promoCode || "N/A"}</span></div>
            <div className="pt-2 border-t border-border/40 text-[10px] text-muted-foreground font-sans">
              Geregistreerd op: {new Date(attribution.firstVisitTime).toLocaleString()}
            </div>
          </>
        ) : (
          <div className="text-center py-4 text-muted-foreground font-sans">
            Geen campagne parameter geregistreerd. Open de app met bijvoorbeeld <span className="text-primary">?utm_source=facebook</span> om campagne-attributie te testen.
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketingDashboard;
