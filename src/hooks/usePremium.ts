import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getStripeEnvironment, hasStripeToken } from "@/lib/stripe";

type Plan = "monthly" | "yearly";

type SubRow = {
  status: string;
  price_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

type PremiumState = {
  premium: boolean;
  isTrial: boolean;
  paidActive: boolean;
  daysLeft: number;
  status: string | null;
  periodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

const computeDaysLeft = (target: number | Date | null): number => {
  if (!target) return 0;
  const t = target instanceof Date ? target.getTime() : target;
  return Math.max(0, Math.ceil((t - Date.now()) / 86_400_000));
};

const isPaidActive = (sub: SubRow | null): boolean => {
  if (!sub) return false;
  if (["active", "trialing", "past_due"].includes(sub.status)) return true;
  return sub.status === "canceled" && !!sub.current_period_end && new Date(sub.current_period_end).getTime() > Date.now();
};

export const usePremium = () => {
  const { user } = useAuth();
  const [sub, setSub] = useState<SubRow | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<number | null>(null);
  const [, setClock] = useState(() => Date.now());
  const refreshing = useRef(false);
  const env = hasStripeToken() ? getStripeEnvironment() : "sandbox";

  const loadSub = useCallback(async () => {
    if (!user) {
      setSub(null);
      return;
    }
    const { data } = await supabase
      .from("subscriptions")
      .select("status, price_id, current_period_end, cancel_at_period_end")
      .eq("user_id", user.id)
      .eq("environment", env)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSub((data as SubRow | null) ?? null);
  }, [user, env]);

  const loadTrial = useCallback(async () => {
    if (!user) {
      setTrialEndsAt(null);
      return;
    }
    const { data, error } = await (supabase.from("profiles") as any)
      .select("trial_ends_at")
      .eq("id", user.id)
      .maybeSingle();
    if (error) {
      // Graceful during a rolling deploy before the database migration lands.
      setTrialEndsAt(null);
      return;
    }
    const iso = data?.trial_ends_at as string | null | undefined;
    setTrialEndsAt(iso ? new Date(iso).getTime() : null);
  }, [user]);

  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      if (user && hasStripeToken()) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch("/api/check-subscription", {
            method: "POST",
            headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ environment: env }),
          }).catch(() => {});
        }
      }
      await Promise.all([loadSub(), loadTrial()]);
    } finally {
      refreshing.current = false;
    }
  }, [user, env, loadSub, loadTrial]);

  useEffect(() => {
    void Promise.all([loadSub(), loadTrial()]);
  }, [loadSub, loadTrial]);

  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(id);
    };
  }, [refresh]);

  const paidActive = isPaidActive(sub);
  const activeTrial = !!trialEndsAt && trialEndsAt > Date.now();
  const isTrialOnly = !paidActive && activeTrial;
  const premium = paidActive || isTrialOnly;
  const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end) : null;
  const daysLeft = paidActive ? computeDaysLeft(periodEnd) : computeDaysLeft(trialEndsAt);

  const state: PremiumState = {
    premium,
    isTrial: isTrialOnly,
    paidActive,
    daysLeft,
    status: sub?.status ?? null,
    periodEnd,
    cancelAtPeriodEnd: !!sub?.cancel_at_period_end,
  };

  const startTrial = useCallback(async () => {
    if (!user) throw new Error("Meld je eerst aan om je gratis proefperiode te starten");
    const { data, error } = await (supabase.rpc as any)("start_trial");
    if (error) {
      const used = /already used/i.test(error.message || "");
      throw new Error(used ? "Je gratis proefperiode werd al gebruikt" : (error.message || "Proefperiode kon niet starten"));
    }
    const iso = Array.isArray(data) ? data[0] : data;
    const end = iso ? new Date(String(iso)).getTime() : null;
    setTrialEndsAt(end);
    await loadTrial();
    return end;
  }, [user, loadTrial]);

  const cancelTrial = useCallback(async () => {
    if (!user) return;
    const { error } = await (supabase.rpc as any)("cancel_trial");
    if (error) throw new Error(error.message || "Proefperiode kon niet worden gestopt");
    await loadTrial();
  }, [user, loadTrial]);

  const setPremium = useCallback(async (value: boolean) => {
    if (value) await startTrial();
    else await cancelTrial();
  }, [startTrial, cancelTrial]);

  const openCheckout = useCallback(async (plan: Plan): Promise<{ clientSecret: string } | null> => {
    if (!user) throw new Error("Niet aangemeld");
    if (!hasStripeToken()) throw new Error("Betalingen nog niet ingeschakeld");
    const priceId = plan === "monthly" ? "premium_monthly" : "premium_yearly";
    const returnUrl = `${window.location.origin}/premium?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Je sessie is verlopen. Meld je opnieuw aan.");
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ priceId, returnUrl, environment: env }),
    });
    const data = await res.json();
    if (!res.ok || !data?.clientSecret) throw new Error(data?.error || "Checkout kon niet starten");
    return { clientSecret: data.clientSecret as string };
  }, [user, env]);

  const openPortal = useCallback(async () => {
    if (!user) throw new Error("Niet aangemeld");
    const returnUrl = `${window.location.origin}/premium`;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Je sessie is verlopen. Meld je opnieuw aan.");
    const res = await fetch("/api/customer-portal", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ environment: env, returnUrl }),
    });
    const data = await res.json();
    if (!res.ok || !data?.url) throw new Error(data?.error || "Portaal kon niet openen");
    window.open(data.url as string, "_blank", "noopener,noreferrer");
  }, [user, env]);

  return {
    ...state,
    trialEndsAt,
    startTrial,
    cancel: cancelTrial,
    setPremium,
    openCheckout,
    openPortal,
    refresh,
  };
};
