"use client";

import Link from "next/link";
import type { Tier } from "@/lib/stripe";
import { track } from "@/lib/analytics";

/**
 * Tasteful inline upgrade prompt used wherever a feature is gated. Shown
 * in place of the feature content — never as a popup. Free-tier friendly.
 */
export function UpgradePrompt({
  feature,
  requiredTier = "pro",
  currentTier,
}: {
  feature: string;
  requiredTier?: Tier;
  currentTier?: Tier;
}) {
  const tierLabel = requiredTier === "institutional" ? "Institutional" : "Pro";
  return (
    <div className="rounded-sm border border-dashed border-[var(--accent-primary)]/40 bg-[rgba(255,102,0,0.04)] p-4">
      <div className="font-mono text-[10px] tracking-[0.16em] text-[var(--accent-primary)] mb-1.5">
        {tierLabel.toUpperCase()} FEATURE
      </div>
      <p className="text-[13px] text-[var(--fg)] leading-snug mb-1">
        <strong>{feature}</strong> is available on the {tierLabel} plan.
      </p>
      <p className="text-[12px] text-[var(--fg-dim)] mb-3">
        {currentTier === "free" || !currentTier
          ? "You're on the Free plan. Upgrade to unlock this and more."
          : `Your current plan (${currentTier}) doesn't include this feature.`}
      </p>
      <Link
        href="/pricing"
        onClick={() => track("feature_gated", { feature, required_tier: requiredTier })}
        className="inline-block px-3 py-1.5 rounded-sm font-mono text-[10px] tracking-[0.14em] bg-[var(--accent-primary)] text-black hover:opacity-90"
      >
        SEE PRICING →
      </Link>
    </div>
  );
}
