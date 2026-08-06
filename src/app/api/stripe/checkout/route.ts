import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  isStripeConfigured,
  priceIdFor,
  stripe,
  type BillingInterval,
  type Tier,
} from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/stripe/checkout
 * Body: { tier: "pro" | "institutional", interval: "monthly" | "yearly" }
 *
 * Creates a Stripe Checkout session for the signed-in user. Reuses the
 * existing Stripe Customer if we've already created one for this email;
 * otherwise Stripe creates one on the fly and the webhook writes the ID
 * back to our Subscription row.
 */
export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe not configured — set STRIPE_SECRET_KEY in Vercel." },
      { status: 501 },
    );
  }

  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    tier?: unknown;
    interval?: unknown;
  };
  const tier = body.tier as Tier;
  const interval = body.interval as BillingInterval;
  if (tier !== "pro" && tier !== "institutional") {
    return NextResponse.json({ error: "invalid tier" }, { status: 400 });
  }
  if (interval !== "monthly" && interval !== "yearly") {
    return NextResponse.json({ error: "invalid interval" }, { status: 400 });
  }

  const priceId = priceIdFor(tier, interval);
  if (!priceId) {
    return NextResponse.json(
      {
        error: `No Stripe price ID configured for ${tier}/${interval}. Add STRIPE_PRICE_${tier.toUpperCase()}_${interval.toUpperCase()} in Vercel.`,
      },
      { status: 501 },
    );
  }

  // Resolve — or create — a Stripe Customer keyed to the SIGNED-IN email.
  // Passing `customer_email` alone lets Stripe Link autofill override with a
  // saved-card email at Checkout, silently attaching the subscription to the
  // wrong account. Explicitly creating the customer server-side locks the
  // email to the one on our Supabase user.
  const existing = await prisma.subscription.findUnique({
    where: { userEmail: user.email },
  });

  const s = stripe();
  let customerId = existing?.stripeCustomerId ?? null;
  if (!customerId) {
    // Deduplicate on the Stripe side — if there's already a Customer with
    // this email from a prior session, reuse it instead of creating a twin.
    const found = await s.customers.list({ email: user.email, limit: 1 });
    customerId =
      found.data[0]?.id ??
      (
        await s.customers.create({
          email: user.email,
          metadata: { userEmail: user.email, supabaseUserId: user.id },
        })
      ).id;
    // Persist the linkage so subsequent checkouts hit the fast path
    await prisma.subscription.upsert({
      where: { userEmail: user.email },
      create: {
        userEmail: user.email,
        stripeCustomerId: customerId,
        tier: "free",
        status: "incomplete",
      },
      update: { stripeCustomerId: customerId },
    });
  }

  const origin = new URL(req.url).origin;

  const session = await s.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    customer: customerId, // locked; Link/autofill cannot override
    client_reference_id: user.id,
    metadata: { userEmail: user.email, tier, interval },
    subscription_data: {
      trial_period_days: 14,
      metadata: { userEmail: user.email, tier, interval },
    },
    success_url: `${origin}/account?checkout=success`,
    cancel_url: `${origin}/pricing?checkout=cancel`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
