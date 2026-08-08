"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * PostHog client-side init + automatic pageview tracking. Silently no-ops if
 * NEXT_PUBLIC_POSTHOG_KEY isn't set, so local/dev deploys work without any
 * PostHog account. Init runs exactly once — subsequent renders just fire a
 * pageview event on route change (App Router doesn't reload the page).
 *
 * We attach the instance to `window.posthog` so the `track()` helper in
 * `lib/analytics.ts` can find it without every consumer importing posthog-js.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    const host =
      process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
    if (typeof window === "undefined") return;

    const w = window as unknown as { posthog?: unknown };
    if (w.posthog) return; // already initialized

    // Dynamic import so the ~40 KB posthog-js bundle isn't in the critical path
    import("posthog-js").then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: host,
        capture_pageview: false, // handled manually below on route change
        capture_pageleave: true,
        person_profiles: "identified_only",
      });
      (window as unknown as { posthog?: unknown }).posthog = posthog;
      posthog.capture("$pageview", { $current_url: window.location.href });
    });
  }, []);

  // Manual pageview on client-side navigation (App Router)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      posthog?: { capture: (n: string, p?: Record<string, unknown>) => void };
    };
    if (!w.posthog) return;
    const qs = search.toString();
    const url = window.location.origin + pathname + (qs ? `?${qs}` : "");
    w.posthog.capture("$pageview", { $current_url: url });
  }, [pathname, search]);

  return <>{children}</>;
}
