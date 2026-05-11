/**
 * Next.js instrumentation hook. Sentry was removed temporarily because
 * @sentry/nextjs doesn't yet declare a peer-dep range that includes
 * Next.js 16. Vercel's built-in logs cover errors in the meantime.
 *
 * When Sentry adds Next 16 support:
 * 1. `npm install @sentry/nextjs`
 * 2. Wrap next.config.ts with withSentryConfig
 * 3. Re-add Sentry.init() blocks below
 */
export async function register() {
  // no-op
}
