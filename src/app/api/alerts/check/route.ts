import { NextResponse } from "next/server";
import { evaluateAlerts } from "@/lib/alerts";

/**
 * Cron target — runs every 5 minutes (configured in vercel.json).
 * Vercel sends a request with `Authorization: Bearer <CRON_SECRET>`. If the
 * secret env var is set we verify; otherwise we allow (so manual tests work).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  const summary = await evaluateAlerts();
  return NextResponse.json({ ok: true, ...summary });
}
