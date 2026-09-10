import type Stripe from "stripe";
import { getAdminClient } from "./_shared.js";

type SubscriptionRow = {
  user_id: string;
  environment: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  price_id: string | null;
  product_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  updated_at: string;
};

export const resolveUserIdFromCheckoutSession = (session: Stripe.Checkout.Session): string | null => {
  const metadataUserId = session.metadata?.userId || session.metadata?.shopgoUserId;
  if (metadataUserId) return metadataUserId;
  if (session.client_reference_id) return session.client_reference_id;
  return null;
};

export const resolveUserIdFromSubscription = (subscription: Stripe.Subscription): string | null => {
  const metadataUserId = subscription.metadata?.userId || subscription.metadata?.shopgoUserId;
  return metadataUserId || null;
};

export const subscriptionRowFromStripe = (
  userId: string,
  customerId: string | null,
  subscription: Stripe.Subscription,
  environment = "live",
): SubscriptionRow => ({
  user_id: userId,
  environment,
  stripe_customer_id: customerId,
  stripe_subscription_id: subscription.id,
  status: subscription.status,
  price_id: subscription.items.data[0]?.price?.id ?? null,
  product_id:
    typeof subscription.items.data[0]?.price?.product === "string"
      ? subscription.items.data[0].price.product
      : null,
  current_period_end: subscription.items.data[0]?.current_period_end
    ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
    : null,
  cancel_at_period_end: subscription.cancel_at_period_end,
  updated_at: new Date().toISOString(),
});

export const upsertSubscriptionRow = async (row: SubscriptionRow) => {
  const supabase = getAdminClient();
  const { error } = await supabase.from("subscriptions").upsert(row, { onConflict: "user_id" });
  if (error) throw error;
};

export const markSubscriptionCanceled = async (userId: string) => {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (error) throw error;
};
