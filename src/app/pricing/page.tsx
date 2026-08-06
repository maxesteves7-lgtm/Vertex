"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TIERS, type BillingInterval, type Tier } from "@/lib/stripe";

/**
 * Pricing page — three-tier comparison with monthly/yearly toggle. Uses
 * TIERS from lib/stripe.ts as the single source of truth for copy + prices
 * so pricing changes only happen in one file.
 */
export default function PricingPage() {
  const router = useRouter();
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [busy, setBusy] = useState<Tier | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(tier: Tier) {
    if (tier === "free") {
      router.push("/signup");
      return;
    }
    setBusy(tier);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tier, interval }),
      });
      const j = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        // 401 = not signed in — redirect to login with a return-to
        if (res.status === 401) {
          router.push(`/login?next=${encodeURIComponent("/pricing")}`);
          return;
        }
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      if (!j.url) throw new Error("no checkout URL returned");
      window.location.href = j.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setBusy(null);
    }
  }

  return (
    <main className="flex-1 flex justify-center px-4 py-10 min-h-[calc(100vh-56px)]">
      <div className="w-full max-w-[1100px]">
        <div className="text-center mb-8">
          <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--fg-mute)] mb-2">
            FUTURIST · PRICING
          </div>
          <h1 className="text-[32px] font-semibold text-[var(--fg)] tracking-tight">
            One terminal, three tiers
          </h1>
          <p className="text-[14px] text-[var(--fg-dim)] mt-2 max-w-xl mx-auto">
            Every plan can be canceled anytime — access continues until the
            end of the billing period. Pro comes with a 14-day free trial,
            no card required.
          </p>

          {/* Interval toggle */}
          <div className="mt-6 inline-flex items-center border border-[var(--border)] rounded-sm overflow-hidden font-mono text-[10px] tracking-[0.14em]">
            <button
              onClick={() => setInterval("monthly")}
              className={`px-4 py-1.5 ${
                interval === "monthly"
                  ? "bg-[var(--accent-primary)] text-black"
                  : "text-[var(--fg-dim)] hover:text-[var(--fg)]"
              }`}
            >
              MONTHLY
            </button>
            <button
              onClick={() => setInterval("yearly")}
              className={`px-4 py-1.5 border-l border-[var(--border)] ${
                interval === "yearly"
                  ? "bg-[var(--accent-primary)] text-black"
                  : "text-[var(--fg-dim)] hover:text-[var(--fg)]"
              }`}
            >
              YEARLY <span className="opacity-70">· save ~30%</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-4 text-center text-[12px] text-[var(--accent-down)] font-mono">
            {error}
          </div>
        )}

        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {TIERS.map((t) => {
            const price = interval === "monthly" ? t.monthly : t.yearly;
            const per = interval === "monthly" ? "/mo" : "/yr";
            const isFree = t.id === "free";
            const isFeatured = t.id === "pro";
            return (
              <div
                key={t.id}
                className={`bg-[var(--bg-elev)] border rounded-sm p-6 flex flex-col ${
                  isFeatured
                    ? "border-[var(--accent-primary)]"
                    : "border-[var(--border)]"
                }`}
              >
                {isFeatured && (
                  <div className="font-mono text-[9px] tracking-[0.18em] text-[var(--accent-primary)] mb-2">
                    MOST POPULAR
                  </div>
                )}
                <div className="font-mono text-[11px] tracking-[0.16em] text-[var(--fg-mute)]">
                  {t.label.toUpperCase()}
                </div>
                <div className="text-[14px] text-[var(--fg-dim)] mt-1 mb-4">
                  {t.tagline}
                </div>
                <div className="mb-5">
                  <span className="text-[36px] font-semibold text-[var(--fg)] tabular-nums">
                    ${price}
                  </span>
                  <span className="text-[13px] text-[var(--fg-mute)] ml-1">
                    {isFree ? "" : per}
                  </span>
                </div>

                <ul className="space-y-1.5 mb-5 text-[13px] text-[var(--fg-dim)] flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="text-[var(--accent-primary)] mt-0.5">
                        ✓
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => startCheckout(t.id)}
                  disabled={busy !== null}
                  className={`w-full px-4 py-2.5 rounded-sm font-mono text-[11px] tracking-[0.14em] transition-colors disabled:opacity-50 ${
                    isFeatured || t.id === "institutional"
                      ? "bg-[var(--accent-primary)] text-black hover:opacity-90"
                      : "border border-[var(--border)] text-[var(--fg)] hover:border-[var(--fg-mute)]"
                  }`}
                >
                  {busy === t.id ? "OPENING CHECKOUT…" : t.cta.toUpperCase()}
                </button>

                <div className="mt-4 pt-4 border-t border-[var(--border-soft)] space-y-1">
                  {Object.entries(t.limits).map(([k, v]) => (
                    <div
                      key={k}
                      className="flex items-center justify-between font-mono text-[10px] tracking-[0.06em]"
                    >
                      <span className="text-[var(--fg-mute)]">{k}</span>
                      <span className="text-[var(--fg)]">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-8 text-[12px] text-[var(--fg-mute)]">
          Questions?{" "}
          <Link
            href="/legal/risk-disclosure"
            className="text-[var(--accent-primary)] underline"
          >
            Read the risk disclosure
          </Link>{" "}
          before subscribing. All plans include a 7-day refund window.
        </div>
      </div>
    </main>
  );
}

