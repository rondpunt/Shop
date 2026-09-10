import { hasStripeToken } from "@/lib/stripe";

/** User-facing Dutch message when Stripe publishable key is missing. */
export function stripeNotConfiguredMessage(): string {
  return "Online betalen is nog niet ingeschakeld. Premium blijft gratis proberen via de proefperiode zodra je bent ingelogd.";
}

export function isStripeCheckoutAvailable(): boolean {
  return hasStripeToken();
}
