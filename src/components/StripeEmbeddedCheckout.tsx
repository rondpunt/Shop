import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";
import { useMemo } from "react";

interface Props {
  clientSecret: string;
  onComplete?: () => void;
}

/**
 * Embedded Stripe checkout. Wrap and render only when clientSecret is set.
 * The `options` object is memoized so the Provider does not remount.
 */
export function StripeEmbeddedCheckout({ clientSecret, onComplete }: Props) {
  const options = useMemo(
    () => ({ fetchClientSecret: async () => clientSecret, onComplete }),
    [clientSecret, onComplete],
  );

  return (
    <div id="checkout" className="rounded-2xl overflow-hidden bg-white">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
