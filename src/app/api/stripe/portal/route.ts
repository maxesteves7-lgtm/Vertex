import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { isStripeConfigured, stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/stripe/portal
 *
 * Creates a Stripe Customer Portal session so the user can update payment
 * method, view invoices, cancel their subscription, etc. — without us
 * having to build any of that ourselves.
 */
export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe not configured" },
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

  const sub = await prisma.subscription.findUnique({
    where: { userEmail: user.email },
  });
  if (!sub?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No Stripe customer on file — subscribe first." },
      { status: 400 },
    );
  }

  const origin = new URL(req.url).origin;
  const session = await stripe().billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${origin}/account`,
  });

  return NextResponse.json({ url: session.url });
}
