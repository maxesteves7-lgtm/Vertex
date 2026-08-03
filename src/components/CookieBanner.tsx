"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * GDPR-flavored cookie consent banner. Persists the user's choice under
 * `vertex.cookieConsent.v1` — one of "accepted" / "declined" — and never
 * shows again after a decision is made. Deliberately gives a real "Decline"
 * option with the same visual weight as "Accept" (no dark patterns).
 *
 * We don't actually run any invasive tracking today (analytics + Sentry
 * are still on the deferred list), so this is a scaffold that behaves
 * correctly the moment those get added.
 */
const KEY = "vertex.cookieConsent.v1";

type Choice = "accepted" | "declined" | null;

export function CookieBanner() {
  const [choice, setChoice] = useState<Choice>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const c = localStorage.getItem(KEY);
      if (c === "accepted" || c === "declined") setChoice(c);
    } catch {
      /* ignore */
    }
  }, []);

  function decide(next: "accepted" | "declined") {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
    setChoice(next);
  }

  // Don't render until we know whether the banner should show (avoid flash)
  if (!mounted || choice !== null) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-3 left-3 right-3 md:left-4 md:right-auto md:max-w-[440px] z-40 bg-[var(--bg-elev)] border border-[var(--border)] rounded-sm p-4 shadow-2xl"
    >
      <div className="font-mono text-[10px] tracking-[0.18em] text-[var(--fg-mute)] mb-2">
        COOKIE PREFERENCES
      </div>
      <p className="text-[12px] text-[var(--fg-dim)] leading-relaxed mb-3">
        Futurist uses a small amount of local storage to remember your
        theme, filters, watchlist, and cached data. We don&apos;t sell or
        share this data. If you decline, only strictly necessary storage
        (auth, preferences) is kept.
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => decide("accepted")}
          className="px-3 py-1.5 rounded-sm font-mono text-[10px] tracking-[0.14em] bg-[var(--accent-primary)] text-black hover:opacity-90"
        >
          ACCEPT ALL
        </button>
        <button
          onClick={() => decide("declined")}
          className="px-3 py-1.5 rounded-sm font-mono text-[10px] tracking-[0.14em] border border-[var(--border)] text-[var(--fg-dim)] hover:text-[var(--fg)] hover:border-[var(--fg-mute)]"
        >
          DECLINE
        </button>
        <Link
          href="/legal/data-sources"
          className="ml-auto font-mono text-[10px] tracking-[0.14em] text-[var(--fg-mute)] hover:text-[var(--accent-primary)] underline"
        >
          LEARN MORE
        </Link>
      </div>
    </div>
  );
}
