/**
 * Thin PostHog wrapper. Everything here is a safe no-op when PostHog isn't
 * loaded (server-side, first render, or env vars missing) so callers never
 * need a null check.
 *
 * Design note: we intentionally do NOT import posthog-js here. The provider
 * (PostHogProvider) attaches the client to `window.posthog`; this helper
 * reads it lazily. That keeps analytics code out of every route bundle.
 */

type Props = Record<string, string | number | boolean | null | undefined>;

// Names are opinions — please respect this naming convention so PostHog
// dashboards stay tidy. Verb_noun, snake_case, past tense.
export type EventName =
  | "signup_completed"
  | "login_completed"
  | "checkout_started"
  | "checkout_completed"
  | "subscription_canceled"
  | "alert_created"
  | "ai_overview_generated"
  | "invite_sent"
  | "invite_accepted"
  | "csv_exported"
  | "screener_saved"
  | "feature_gated"; // fired when user hits a paywall — great funnel signal

interface PostHogLike {
  capture: (name: string, props?: Props) => void;
  identify: (id: string, props?: Props) => void;
  reset: () => void;
}

function ph(): PostHogLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { posthog?: PostHogLike };
  return w.posthog ?? null;
}

export function track(name: EventName, props?: Props): void {
  ph()?.capture(name, props);
}

/** Call after login / on session restore so events attach to the user. */
export function identify(userEmail: string, props?: Props): void {
  ph()?.identify(userEmail, { email: userEmail, ...(props ?? {}) });
}

/** Call on logout so the next session starts anonymous. */
export function resetAnalytics(): void {
  ph()?.reset();
}
