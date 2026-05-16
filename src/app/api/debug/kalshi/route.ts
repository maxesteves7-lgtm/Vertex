import { NextResponse } from "next/server";

/**
 * Diagnostic endpoint — tries each Kalshi API base and reports what
 * comes back. Read-only, no secrets exposed. Safe to leave deployed.
 *
 * Visit https://predix-ochre.vercel.app/api/debug/kalshi
 */

const CANDIDATES = [
  "https://api.elections.kalshi.com/trade-api/v2/markets",
  "https://api.kalshi.com/trade-api/v2/markets",
  "https://trading-api.kalshi.com/trade-api/v2/markets",
];

export async function GET() {
  const results: Array<{
    url: string;
    status: number | string;
    sampleKeys?: string[];
    marketCount?: number;
    sampleMarket?: Record<string, unknown>;
    body?: string;
    error?: string;
  }> = [];

  for (const base of CANDIDATES) {
    const url = `${base}?status=open&limit=3`;
    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: { accept: "application/json" },
      });
      const text = await res.text();
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        /* not JSON */
      }
      const obj = parsed as { markets?: unknown[] } | null;
      const markets =
        obj && Array.isArray(obj.markets) ? obj.markets : null;
      results.push({
        url,
        status: res.status,
        sampleKeys:
          parsed && typeof parsed === "object"
            ? Object.keys(parsed as object)
            : undefined,
        marketCount: markets ? markets.length : undefined,
        sampleMarket: markets && markets[0] ? (markets[0] as Record<string, unknown>) : undefined,
        body: markets ? undefined : text.slice(0, 500),
      });
    } catch (e) {
      results.push({
        url,
        status: "fetch threw",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({ results }, { status: 200 });
}
