import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, tierForPriceId, type Tier } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/stripe/webhook
 *
 * Stripe posts subscription lifecycle events here. We verify the signature
 * using STRIPE_WEBHOOK_SECRET, then mirror the resulting state into our
 * `Subscription` table so the rest of the app can gate features via the
 * `getSubscription()` helper (no Stripe API calls at request time).
 *
 * Events handled:
 *   - checkout.session.completed        → link user email + Stripe customer
 *   - customer.subscription.created     → same as .updated (idempotent upsert)
 *   - customer.subscription.updated     → tier / period / cancel-at flag
 *   - customer.subscription.deleted     → downgrade to free
 *   - invoice.payment_failed            → mark past_due
 */

// Stripe signature verification requires the raw body; do NOT let Next
// parse it. `runtime: "nodejs"` because the Stripe SDK uses Node APIs.
export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET not set" },
      { status: 501 },
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "missing stripe-signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, sig, secret);
  } catch (e) {
    return NextResponse.json(
      { error: `signature verification failed: ${e instanceof Error ? e.message : "unknown"}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      // Ignore other events for now
    }
  } catch (e) {
    console.error("[stripe webhook] handler failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "handler failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const email = session.customer_email ?? session.metadata?.userEmail ?? null;
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  if (!email || !customerId) return;

  // Link this customer to the user. The tier/period fields will be filled
  // in by the customer.subscription.created event that arrives moments later.
  await prisma.subscription.upsert({
    where: { userEmail: email },
    create: {
      userEmail: email,
      stripeCustomerId: customerId,
      tier: "free",
      status: "incomplete",
    },
    update: { stripeCustomerId: customerId },
  });
}

async function handleSubscriptionUpsert(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const email = sub.metadata?.userEmail ?? null;

  const priceId = sub.items.data[0]?.price.id;
  const derived = priceId ? tierForPriceId(priceId) : null;
  const tier: Tier = derived?.tier ?? "free";
  const interval = derived?.interval ?? null;

  const currentPeriodEnd = new Date(
    (sub as unknown as { current_period_end?: number }).current_period_end
      ? ((sub as unknown as { current_period_end: number }).current_period_end) * 1000
      : Date.now(),
  );

  // Locate user email — prefer metadata, fall back to a customer lookup on Stripe
  let userEmail = email;
  if (!userEmail) {
    const customer = await stripe().customers.retrieve(customerId);
    if (!(customer as Stripe.DeletedCustomer).deleted) {
      userEmail = (customer as Stripe.Customer).email ?? null;
    }
  }
  if (!userEmail) return;

  await prisma.subscription.upsert({
    where: { userEmail },
    create: {
      userEmail,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      tier,
      status: sub.status,
      interval,
      currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
    update: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      tier,
      status: sub.status,
      interval,
      currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  await prisma.subscription.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      tier: "free",
      status: "canceled",
      stripeSubscriptionId: null,
      cancelAtPeriodEnd: false,
    },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;
  if (!customerId) return;
  await prisma.subscription.updateMany({
    where: { stripeCustomerId: customerId },
    data: { status: "past_due" },
  });
}
