import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getStripeEnvironment, hasStripeToken } from "@/lib/stripe";

const TRIAL_KEY = "shopgo:premium:trial_end";
const TRIAL_DAYS = 7;

type Plan = "monthly" | "yearly";

type SubRow = {
  status: string;
  price_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

type PremiumState = {
  /** True when user has paid sub OR active local trial. */
  premium: boolean;
  /** True only when in (local) free trial. */
  isTrial: boolean;
  /** True when paid sub is active or trialing or canceled-with-grace. */
  paidActive: boolean;
  /** Days left of trial / paid period (whichever applies). */
  daysLeft: number;
  /** Status string from Stripe ('active'|'trialing'|'canceled'|'past_due'|'none'|null). */
  status: string | null;
  /** End-of-period (paid) date. */
  periodEnd: Date | null;
  /** Whether the paid sub is set to cancel at period end. */
  cancelAtPeriodEnd: boolean;
};

const readTrialEnd = (): number | null => {
  try {
    const raw = localStorage.getItem(TRIAL_KEY);
    if (!raw) return null;
    const t = Number(raw);
    if (!Number.isFinite(t)) return null;
    if (Date.now() >= t) {
      localStorage.removeItem(TRIAL_KEY);
      return null;
    }
    return t;
  } catch {
    return null;
  }
};

const computeDaysLeft = (target: number | Date | null): number => {
  if (!target) return 0;
  const t = target instanceof Date ? target.getTime() : target;
  return Math.max(0, Math.ceil((t - Date.now()) / 86_400_000));
};

const isPaidActive = (sub: SubRow | null): boolean => {
  if (!sub) return false;
  if (sub.status === "active" || sub.status === "trialing" || sub.status === "past_due") return true;
  if (sub.status === "canceled" && sub.current_period_end) {
    return new Date(sub.current_period_end).getTime() > Date.now();
  }
  return false;
};

export const usePremium = () => {
  const { user } = useAuth();
  const [sub, setSub] = useState<SubRow | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<number | null>(readTrialEnd());
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

  /** Calls check-subscription edge function to sync from Stripe, then reloads row. */
  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      if (user && hasStripeToken()) {
        // Re-check session right before invoking — `user` from React state can lag
        // behind a logout, leaving the function call without a valid Authorization header (401).
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch("/api/check-subscription", { method: "POST", headers: { "Authorization": `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ environment: env }) }).catch(() => {});
        }
      }
      await loadSub();
      setTrialEndsAt(readTrialEnd());
    } finally {
      refreshing.current = false;
    }
  }, [user, env, loadSub]);

  useEffect(() => {
    loadSub();
  }, [loadSub]);

  // Refresh on window focus + every 60s for trial countdown.
  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(() => setTrialEndsAt(readTrialEnd()), 60_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(id);
    };
  }, [refresh]);

  // NOTE: Realtime on subscriptions removed for security — billing data should
  // not be broadcast through the realtime channel. We rely on focus + 60s
  // polling above, plus an explicit refresh() after checkout returns.

  const paidActive = isPaidActive(sub);
  const isTrialOnly = !paidActive && !!trialEndsAt;
  const premium = paidActive || isTrialOnly;

  const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end) : null;
  const daysLeft = paidActive
    ? computeDaysLeft(periodEnd)
    : computeDaysLeft(trialEndsAt);

  const state: PremiumState = {
    premium,
    isTrial: isTrialOnly,
    paidActive,
    daysLeft,
    status: sub?.status ?? null,
    periodEnd,
    cancelAtPeriodEnd: !!sub?.cancel_at_period_end,
  };

  const startTrial = useCallback(() => {
    const end = Date.now() + TRIAL_DAYS * 86_400_000;
    try {
      localStorage.setItem(TRIAL_KEY, String(end));
    } catch {
      /* ignore */
    }
    setTrialEndsAt(end);
  }, []);

  const cancelTrial = useCallback(() => {
    try {
      localStorage.removeItem(TRIAL_KEY);
    } catch {
      /* ignore */
    }
    setTrialEndsAt(null);
  }, []);

  /** Backwards-compat. true → start trial, false → cancel trial. */
  const setPremium = useCallback(
    (value: boolean) => {
      if (value) startTrial();
      else cancelTrial();
    },
    [startTrial, cancelTrial],
  );

  const openCheckout = useCallback(
    async (plan: Plan): Promise<{ clientSecret: string } | null> => {
      if (!user) throw new Error("Niet aangemeld");
      if (!hasStripeToken()) throw new Error("Betalingen nog niet ingeschakeld");
      const priceId = plan === "monthly" ? "premium_monthly" : "premium_yearly";
      const returnUrl = `${window.location.origin}/premium?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Authorization": `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, returnUrl, environment: env }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout kon niet starten");
      if (!data?.clientSecret) throw new Error("Checkout kon niet starten");
      return { clientSecret: data.clientSecret as string };
    },
    [user, env],
  );

  const openPortal = useCallback(async () => {
    if (!user) throw new Error("Niet aangemeld");
    const returnUrl = `${window.location.origin}/premium`;
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/customer-portal", {
      method: "POST",
      headers: { "Authorization": `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ environment: env, returnUrl }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Portaal kon niet openen");
    if (!data?.url) throw new Error("Portaal kon niet openen");
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
