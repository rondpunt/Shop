/**
 * Canonical Premium pricing — single source of truth for paywall UI and marketing copy.
 * Stripe lookup keys remain premium_monthly / premium_yearly; create matching Prices in Stripe Dashboard.
 */
export const PREMIUM_PRICING = {
  monthly: {
    amount: 3.99,
    label: "€3,99",
    suffix: "/ maand",
    stripeLookupKey: "premium_monthly" as const,
  },
  yearly: {
    amount: 29.99,
    label: "€29,99",
    suffix: "/ jaar",
    stripeLookupKey: "premium_yearly" as const,
  },
} as const;

export type PremiumPlan = keyof typeof PREMIUM_PRICING;

export const formatPlanPrice = (plan: PremiumPlan): string =>
  `${PREMIUM_PRICING[plan].label}${PREMIUM_PRICING[plan].suffix}`;

/** Yearly savings vs paying monthly for 12 months. */
export const yearlySavingsPercent = (): number => {
  const monthlyTotal = PREMIUM_PRICING.monthly.amount * 12;
  const yearly = PREMIUM_PRICING.yearly.amount;
  return Math.round((1 - yearly / monthlyTotal) * 100);
};

export const PREMIUM_TAGLINE = "Goedkoper dan één boete — parkeer slimmer in Kortrijk";

export const stripeLookupKeyForPlan = (plan: PremiumPlan): string =>
  PREMIUM_PRICING[plan].stripeLookupKey;
