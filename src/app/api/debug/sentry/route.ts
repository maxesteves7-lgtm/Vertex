import { NextResponse } from "next/server";

/**
 * GET /api/debug/sentry
 *
 * Deliberately throws so a Sentry-configured deployment reports the error.
 * Useful for confirming the SDK is wired up without opening DevTools —
 * visiting the URL in a browser tab is enough.
 *
 * The check on `?ok=1` lets us hit the route without triggering the error
 * (e.g. to prove the route is deployed).
 */
export async function GET(req: Request) {
  const ok = new URL(req.url).searchParams.get("ok");
  if (ok === "1") {
    return NextResponse.json({ route: "reachable", triggered: false });
  }
  throw new Error(
    `sentry test error — triggered from /api/debug/sentry at ${new Date().toISOString()}`,
  );
}
