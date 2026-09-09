import { Capacitor } from "@capacitor/core";
import { loadStripe, type Stripe } from "@stripe/stripe-js";

export type StripeEnv = "sandbox" | "live";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;
const environment: StripeEnv = clientToken?.startsWith("pk_test_") ? "sandbox" : "live";

let stripePromise: Promise<Stripe | null> | null = null;

export function isNativeStoreBuild(): boolean {
  return Capacitor.isNativePlatform();
}

export function getStripe(): Promise<Stripe | null> {
  if (isNativeStoreBuild()) {
    throw new Error("Webbetalingen zijn niet beschikbaar in de Android Store-versie.");
  }
  if (!stripePromise) {
    if (!clientToken) throw new Error("VITE_PAYMENTS_CLIENT_TOKEN is not set");
    stripePromise = loadStripe(clientToken);
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  return environment;
}

/** Publishable key present and not a native store build. */
export function hasStripeToken(): boolean {
  return !isNativeStoreBuild() && !!clientToken;
}

/** Human-readable reason when web checkout is unavailable. */
export function getPaymentsUnavailableMessage(): string {
  if (isNativeStoreBuild()) {
    return "Gebruik Google Play om Premium te activeren in de app.";
  }
  if (!clientToken) {
    return "Betalingen zijn nog niet geconfigureerd voor deze omgeving. Voeg VITE_PAYMENTS_CLIENT_TOKEN en STRIPE_SECRET_KEY toe.";
  }
  return "Betalingen tijdelijk niet beschikbaar.";
}
