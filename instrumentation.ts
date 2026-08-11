/**
 * Next.js 15+ instrumentation entrypoint. Runs once at server startup and
 * loads the appropriate Sentry config file for the current runtime.
 *
 * Without this file, `sentry.server.config.ts` / `sentry.edge.config.ts`
 * are only picked up in dev — production server errors would go uncaught.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

/**
 * Bubbles thrown/uncaught errors from React server components and RSC
 * streaming into Sentry. Required by @sentry/nextjs v8+ for full coverage.
 */
export async function onRequestError(
  err: unknown,
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string | string[] | undefined };
  },
  context: { routerKind: "Pages Router" | "App Router"; routePath: string; routeType: "render" | "route" | "action" | "middleware" },
): Promise<void> {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(err, request, context);
}
