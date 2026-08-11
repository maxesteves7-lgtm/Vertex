"use client";

import { useEffect, useState } from "react";
import type { Tier } from "./stripe";

export type ClientSubscription = {
  tier: Tier;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

type State = {
  loaded: boolean;
  signedIn: boolean;
  email: string | null;
  sub: ClientSubscription;
};

const FREE: ClientSubscription = {
  tier: "free",
  status: "active",
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
};

/**
 * Client-side subscription hook. Reads /api/subscription, exposes
 * `{ loaded, signedIn, email, sub }`. In-flight requests are deduped so
 * multiple gates on the same page share a single fetch, and the resolved
 * result is cached for a short TTL so gates that mount seconds apart don't
 * refetch — but the cache expires so newly-purchased subscriptions get
 * picked up on the next navigation without a hard reload.
 *
 * The old "cache-forever" version had a real bug: if the page ever loaded
 * while the user was signed out (or before Stripe finished processing),
 * every downstream gate stayed pinned at "free" for the rest of the browser
 * session — so an Institutional user could see paywall prompts on Order Flow
 * and Heatmap. TTL fixes that at a negligible cost.
 */
const TTL_MS = 10_000;
let cachedPromise: Promise<State> | null = null;
let cachedAt = 0;

async function loadOnce(): Promise<State> {
  if (cachedPromise && Date.now() - cachedAt < TTL_MS) return cachedPromise;
  cachedAt = Date.now();
  cachedPromise = (async () => {
    try {
      const r = await fetch("/api/subscription", { cache: "no-store" });
      const j = (await r.json()) as {
        signedIn?: boolean;
        email?: string | null;
        subscription?: ClientSubscription;
      };
      return {
        loaded: true,
        signedIn: !!j.signedIn,
        email: j.email ?? null,
        sub: j.subscription ?? FREE,
      };
    } catch {
      return { loaded: true, signedIn: false, email: null, sub: FREE };
    }
  })();
  return cachedPromise;
}

/** Force re-fetch — call after upgrade/downgrade so gates re-evaluate. */
export function refreshSubscription() {
  cachedPromise = null;
  cachedAt = 0;
}

export function useSubscription(): State {
  const [state, setState] = useState<State>({
    loaded: false,
    signedIn: false,
    email: null,
    sub: FREE,
  });
  useEffect(() => {
    let cancelled = false;
    loadOnce().then((s) => {
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

/** True when the current user's tier includes access to a given feature. */
export function tierHas(tier: Tier, feature: PaywalledFeature): boolean {
  switch (feature) {
    case "ai_overview":
    case "order_flow":
    case "csv_export":
    case "alerts":
    case "correlation_heatmap":
    case "unlimited_scanner":
      return tier === "pro" || tier === "institutional";
    case "unlimited_ai":
    case "api_access":
      return tier === "institutional";
  }
}

export type PaywalledFeature =
  | "ai_overview"
  | "order_flow"
  | "csv_export"
  | "alerts"
  | "correlation_heatmap"
  | "unlimited_scanner"
  | "unlimited_ai"
  | "api_access";
