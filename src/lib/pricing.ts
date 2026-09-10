/**
 * Shop&Go Premium pricing (digital subscriptions via Stripe lookup keys).
 * Stripe products must use lookup keys `premium_monthly` and `premium_yearly`.
 */
export const PREMIUM_TAGLINE = "Goedkoper dan één boete";

export const PREMIUM_MONTHLY_EUR = 3.99;
export const PREMIUM_YEARLY_EUR = 29.99;

export type PremiumPlan = "monthly" | "yearly";

export const PREMIUM_PLANS: Record<
  PremiumPlan,
  { amount: number; periodLabel: string; checkoutLabel: string }
> = {
  monthly: {
    amount: PREMIUM_MONTHLY_EUR,
    periodLabel: "maand",
    checkoutLabel: "€3,99/maand",
  },
  yearly: {
    amount: PREMIUM_YEARLY_EUR,
    periodLabel: "jaar",
    checkoutLabel: "€29,99/jaar",
  },
};

/** Dutch currency formatting for UI (e.g. €3,99). */
export function formatPremiumPrice(amount: number): string {
  return amount.toLocaleString("nl-BE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Rounded savings vs paying monthly for 12 months. */
export function premiumYearlySavingsPercent(): number {
  const monthlyAnnual = PREMIUM_MONTHLY_EUR * 12;
  return Math.round((1 - PREMIUM_YEARLY_EUR / monthlyAnnual) * 100);
}

export const PREMIUM_FEATURES = {
  free: [
    "1 voertuig",
    "Tot 8 favoriete parkeerzones",
    "1 waarschuwing per timer",
    "Kaart & timer zonder account",
    "Beperkte parkeerhistoriek",
  ],
  premium: [
    "Onbeperkt favorieten",
    "Volledige historiek + PDF-export",
    "Meerdere voertuigen",
    "Dubbele timerwaarschuwingen",
    "Live timer-widget op je scherm",
    "Cloud sync & back-up",
  ],
} as const;
