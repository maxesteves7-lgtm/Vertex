import Stripe from "stripe";

/**
 * Stripe SDK singleton. Uses the account's default API version so we don't
 * have to touch this file when Stripe promotes a new one.
 */
let cached: Stripe | null = null;
export function stripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY not set. Configure it in Vercel to enable billing.",
    );
  }
  cached = new Stripe(key);
  return cached;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier catalogue + Stripe price IDs
// ─────────────────────────────────────────────────────────────────────────────

export type Tier = "free" | "pro" | "institutional";
export type BillingInterval = "monthly" | "yearly";

export type TierDef = {
  id: Tier;
  label: string;
  tagline: string;
  monthly: number; // display price in USD
  yearly: number;
  features: string[];
  limits: Record<string, string>;
  cta: string;
};

export const TIERS: TierDef[] = [
  {
    id: "free",
    label: "Free",
    tagline: "Browse the market",
    monthly: 0,
    yearly: 0,
    features: [
      "Top 100 events by volume",
      "Basic filters + search",
      "Sidebar categories + subcategories",
      "News Wire (raw headlines)",
    ],
    limits: {
      "AI Overview": "—",
      "Order Flow tape": "—",
      "CSV export": "—",
      "Custom screeners": "0",
    },
    cta: "Sign up free",
  },
  {
    id: "pro",
    label: "Pro",
    tagline: "For serious individual traders",
    monthly: 49,
    yearly: 399, // $33.25/mo effective
    features: [
      "Every active market — no cap",
      "All advanced filters + presets",
      "AI Overview (20/day)",
      "Order Flow tape + whale alerts",
      "Price history + OHLC charts",
      "Order book + depth",
      "Watchlist + alerts (email + in-app)",
      "CSV export",
      "Correlation heatmap",
    ],
    limits: {
      "Custom screeners": "5",
      "Team seats": "1",
    },
    cta: "Start free trial",
  },
  {
    id: "institutional",
    label: "Institutional",
    tagline: "Desks, funds, prop shops",
    monthly: 299,
    yearly: 2499, // $208.25/mo effective
    features: [
      "Everything in Pro",
      "Unlimited AI Overviews",
      "REST API access",
      "Priority support",
      "Team seats (up to 5)",
      "Custom screener limits raised",
      "SLA + status page access",
    ],
    limits: {
      "Custom screeners": "Unlimited",
      "Team seats": "5",
    },
    cta: "Contact sales",
  },
];

/**
 * Map a (tier, interval) pair to the Stripe Price ID. Set these env vars
 * in Vercel after creating the four prices in the Stripe dashboard.
 * Returns null for the free tier (no Stripe involvement).
 */
export function priceIdFor(tier: Tier, interval: BillingInterval): string | null {
  if (tier === "free") return null;
  const map: Record<Tier, Record<BillingInterval, string | undefined>> = {
    free: { monthly: undefined, yearly: undefined },
    pro: {
      monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
      yearly: process.env.STRIPE_PRICE_PRO_YEARLY,
    },
    institutional: {
      monthly: process.env.STRIPE_PRICE_INSTITUTIONAL_MONTHLY,
      yearly: process.env.STRIPE_PRICE_INSTITUTIONAL_YEARLY,
    },
  };
  return map[tier][interval] ?? null;
}

/**
 * Reverse lookup — given a Stripe Price ID (from a webhook payload) return
 * the (tier, interval) pair. Used by the webhook to write our own tier
 * column from Stripe's canonical state.
 */
export function tierForPriceId(
  priceId: string,
): { tier: Tier; interval: BillingInterval } | null {
  const candidates: Array<[Tier, BillingInterval, string | undefined]> = [
    ["pro", "monthly", process.env.STRIPE_PRICE_PRO_MONTHLY],
    ["pro", "yearly", process.env.STRIPE_PRICE_PRO_YEARLY],
    ["institutional", "monthly", process.env.STRIPE_PRICE_INSTITUTIONAL_MONTHLY],
    ["institutional", "yearly", process.env.STRIPE_PRICE_INSTITUTIONAL_YEARLY],
  ];
  for (const [tier, interval, id] of candidates) {
    if (id && id === priceId) return { tier, interval };
  }
  return null;
}
