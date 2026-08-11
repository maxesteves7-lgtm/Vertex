/**
 * Next.js 15+ instrumentation entrypoint. Runs once at server startup and
 * loads the appropriate Sentry config file for the current runtime.
 *
 * Without this file, `sentry.server.config.ts` / `sentry.edge.config.ts`
 * are only picked up in dev; production server errors would go uncaught.
 */

export async function register() {
  try {
    if (process.env.NEXT_RUNTIME === "nodejs") {
      await import("./sentry.server.config");
    }
    if (process.env.NEXT_RUNTIME === "edge") {
      await import("./sentry.edge.config");
    }
  } catch {
    // Never let instrumentation failure crash the server. If Sentry isn't
    // installed or the config errors, we silently skip and the app keeps
    // running.
  }
}
