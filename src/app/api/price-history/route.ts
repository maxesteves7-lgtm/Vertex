import { NextResponse } from "next/server";
import { fetchPolymarketPriceHistory } from "@/lib/exchanges/polymarket";

/**
 * GET /api/price-history?tokenId=<polymarket-yes-token-id>&interval=1h|6h|1d|1w|1m|max
 *
 * Server proxy that fetches a Polymarket CLOB price-history series and
 * returns it normalized as `{ history: [{t, p}, ...] }`. Lives behind our
 * own API surface so the client doesn't need to know provider URLs (and
 * we can swap providers later without touching the chart component).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const tokenId = url.searchParams.get("tokenId");
  const intervalParam = url.searchParams.get("interval") ?? "1d";

  if (!tokenId) {
    return NextResponse.json(
      { error: "tokenId query param required" },
      { status: 400 },
    );
  }

  const allowed = new Set(["1h", "6h", "1d", "1w", "1m", "max"]);
  const interval = allowed.has(intervalParam)
    ? (intervalParam as "1h" | "6h" | "1d" | "1w" | "1m" | "max")
    : "1d";

  try {
    const history = await fetchPolymarketPriceHistory({ tokenId, interval });
    return NextResponse.json(
      { history },
      {
        headers: {
          // Cache at edge for 60s; revalidate in background after that
          "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Failed to fetch price history",
      },
      { status: 502 },
    );
  }
}
