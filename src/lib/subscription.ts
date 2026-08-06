/**
 * Subscription lookup + feature-access helpers. Reads from the Prisma
 * Subscription table (mirrored from Stripe via webhook). Everything else in
 * the app that needs to gate a feature imports from here.
 */

import { prisma } from "./prisma";
import type { Tier } from "./stripe";

export type EffectiveSubscription = {
  tier: Tier;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

/** Feature names known to the app. Add new ones here as they get gated. */
export type Feature =
  | "ai_overview"
  | "order_flow"
  | "csv_export"
  | "watchlist"
  | "alerts"
  | "correlation_heatmap"
  | "api_access"
  | "unlimited_ai";

/**
 * Fetch the current effective subscription for a user email. Returns a
 * "free" default when no row exists (never throws). Callers can treat the
 * return value as authoritative — `null` is only ever returned when the
 * email is missing (guest / not signed in).
 */
export async function getSubscription(
  userEmail: string | null | undefined,
): Promise<EffectiveSubscription> {
  if (!userEmail) return freeDefault();
  try {
    const row = await prisma.subscription.findUnique({
      where: { userEmail },
    });
    if (!row) return freeDefault();

    // If the sub has actually lapsed (period ended and not renewed) but the
    // webhook hasn't downgraded us yet, treat as free to avoid over-granting
    if (
      row.currentPeriodEnd &&
      row.currentPeriodEnd.getTime() < Date.now() &&
      row.status !== "active" &&
      row.status !== "trialing"
    ) {
      return freeDefault();
    }

    return {
      tier: (row.tier as Tier) ?? "free",
      status: row.status,
      currentPeriodEnd: row.currentPeriodEnd,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    };
  } catch {
    // DB unavailable → be conservative, deny paid features
    return freeDefault();
  }
}

function freeDefault(): EffectiveSubscription {
  return {
    tier: "free",
    status: "active",
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  };
}

/**
 * Feature matrix — which tier unlocks which capability. Update alongside
 * the /pricing page copy in `lib/stripe.ts::TIERS`.
 */
const FEATURE_MATRIX: Record<Feature, Tier[]> = {
  ai_overview: ["pro", "institutional"],
  order_flow: ["pro", "institutional"],
  csv_export: ["pro", "institutional"],
  watchlist: ["free", "pro", "institutional"], // free-tier can favorite locally
  alerts: ["pro", "institutional"],
  correlation_heatmap: ["pro", "institutional"],
  api_access: ["institutional"],
  unlimited_ai: ["institutional"],
};

export function hasFeature(
  sub: EffectiveSubscription | null | undefined,
  feature: Feature,
): boolean {
  const tier = sub?.tier ?? "free";
  return FEATURE_MATRIX[feature].includes(tier);
}
