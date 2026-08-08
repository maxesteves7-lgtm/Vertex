/**
 * Sentry — browser side. Runs in every page. Guarded on NEXT_PUBLIC_SENTRY_DSN
 * so the app builds fine when Sentry isn't configured yet.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    // Sample 20% of sessions in prod, 100% in dev — good default until we
    // know actual traffic.
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
    replaysSessionSampleRate: 0, // opt-in later if needed
    replaysOnErrorSampleRate: 1.0, // always replay error sessions
    // Don't spam Sentry with browser extensions or ad-blockers throwing
    ignoreErrors: [
      "Non-Error promise rejection captured",
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
    ],
    integrations: [Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false })],
  });
}
