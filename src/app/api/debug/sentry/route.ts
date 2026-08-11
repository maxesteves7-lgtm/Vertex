import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

/**
 * GET /api/debug/sentry
 *
 * Explicitly captures a test error via the Sentry SDK, flushes, and returns
 * a diagnostic payload showing whether the DSN was seen and whether the
 * capture succeeded. `?ok=1` returns without capturing.
 *
 * We use `captureException` + `flush` rather than a bare `throw` so we know
 * definitively whether the failure is (a) DSN missing, (b) SDK not initialized,
 * or (c) network to Sentry ingest.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("ok") === "1") {
    return NextResponse.json({ route: "reachable", triggered: false });
  }

  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? null;
  const eventId = Sentry.captureException(
    new Error(
      `sentry test error — triggered from /api/debug/sentry at ${new Date().toISOString()}`,
    ),
  );
  const flushed = await Sentry.flush(3000);

  return NextResponse.json({
    dsnSeen: !!dsn,
    dsnHost: dsn ? new URL(dsn).host : null,
    eventId: eventId ?? null,
    flushed,
    note: eventId
      ? "Check Sentry Issues within ~60 seconds"
      : "captureException returned no event id — DSN likely missing or SDK not initialized",
  });
}
