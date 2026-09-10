import type Stripe from "stripe";
import {
  markSubscriptionCanceled,
  resolveUserIdFromCheckoutSession,
  resolveUserIdFromSubscription,
  subscriptionRowFromStripe,
  upsertSubscriptionRow,
} from "./_subscriptions.js";
import { fail, getAdminClient, getStripeServer } from "./_shared.js";

const readRawBody = async (req: any): Promise<Buffer> => {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body);
  if (req.body instanceof Uint8Array) return Buffer.from(req.body);

  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer | string) => {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
};

const webhookSecret = () => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw Object.assign(new Error("Webhook secret is not configured"), { statusCode: 503 });
  }
  return secret;
};

const claimWebhookEvent = async (event: Stripe.Event) => {
  const supabase = getAdminClient();
  const { error } = await supabase.from("stripe_webhook_events").insert({
    event_id: event.id,
    event_type: event.type,
  });
  if (error?.code === "23505") return false;
  if (error) throw error;
  return true;
};

const releaseWebhookEvent = async (eventId: string) => {
  const supabase = getAdminClient();
  await supabase.from("stripe_webhook_events").delete().eq("event_id", eventId);
};

const handleCheckoutCompleted = async (stripe: Stripe, session: Stripe.Checkout.Session) => {
  const userId = resolveUserIdFromCheckoutSession(session);
  if (!userId) {
    throw Object.assign(new Error("Checkout session missing user binding"), { statusCode: 400 });
  }

  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const boundUserId = resolveUserIdFromSubscription(subscription) || userId;
  if (boundUserId !== userId) {
    throw Object.assign(new Error("Subscription user binding mismatch"), { statusCode: 400 });
  }

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

  await upsertSubscriptionRow(
    subscriptionRowFromStripe(boundUserId, customerId, subscription),
  );
};

const handleSubscriptionUpdated = async (subscription: Stripe.Subscription) => {
  const userId = resolveUserIdFromSubscription(subscription);
  if (!userId) {
    throw Object.assign(new Error("Subscription missing user binding"), { statusCode: 400 });
  }

  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null;

  await upsertSubscriptionRow(subscriptionRowFromStripe(userId, customerId, subscription));
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const stripe = getStripeServer();
    const signature = String(req.headers?.["stripe-signature"] || "");
    if (!signature) {
      return res.status(400).json({ error: "Missing Stripe signature" });
    }

    const rawBody = await readRawBody(req);
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret());
    } catch {
      return res.status(400).json({ error: "Invalid Stripe signature" });
    }

    const claimed = await claimWebhookEvent(event);
    if (!claimed) {
      return res.status(200).json({ received: true, duplicate: true });
    }

    try {
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutCompleted(stripe, event.data.object as Stripe.Checkout.Session);
          break;
        case "customer.subscription.updated":
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const userId = resolveUserIdFromSubscription(subscription);
          if (!userId) {
            throw Object.assign(new Error("Subscription missing user binding"), { statusCode: 400 });
          }
          await markSubscriptionCanceled(userId);
          break;
        }
        default:
          break;
      }
    } catch (processingError) {
      await releaseWebhookEvent(event.id);
      throw processingError;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return fail(res, error);
  }
}
