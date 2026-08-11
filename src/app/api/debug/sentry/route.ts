import { NextResponse } from "next/server";

/**
 * GET /api/debug/sentry
 *
 * Bulletproof diagnostic. Reports whether the DSN env vars are visible,
 * whether @sentry/nextjs can be dynamically imported, and whether a
 * captureException + flush cycle completes. Never throws — always returns
 * a JSON payload we can read from the browser.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("ok") === "1") {
    return NextResponse.json({ route: "reachable" });
  }

  const publicDsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? null;
  const serverDsn = process.env.SENTRY_DSN ?? null;
  const dsn = serverDsn ?? publicDsn;

  const diag: Record<string, unknown> = {
    hasServerDsn: !!serverDsn,
    hasPublicDsn: !!publicDsn,
    dsnHost: dsn ? safeHost(dsn) : null,
    org: process.env.SENTRY_ORG ?? null,
    project: process.env.SENTRY_PROJECT ?? null,
    nodeEnv: process.env.NODE_ENV,
    runtime: process.env.NEXT_RUNTIME ?? null,
  };

  try {
    const Sentry = await import("@sentry/nextjs");
    diag.sentryImport = "ok";
    const eventId = Sentry.captureException(
      new Error(
        `sentry test error — ${new Date().toISOString()}`,
      ),
    );
    diag.eventId = eventId ?? null;
    diag.flushed = await Sentry.flush(3000);
  } catch (e) {
    diag.sentryImport = "failed";
    diag.error = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(diag);
}

function safeHost(u: string): string | null {
  try {
    return new URL(u).host;
  } catch {
    return null;
  }
}
