import { NextResponse } from "next/server";
import { fetchPolymarketOrderBook } from "@/lib/exchanges/polymarket";

/**
 * GET /api/book?tokenId=<polymarket-outcome-token-id>
 *
 * Server proxy for the Polymarket CLOB L2 order book. Returns:
 *   { bids: [{price, size}], asks: [{price, size}], timestamp }
 *
 * Cached at edge for 4 seconds — the book is refreshed frequently, so we
 * balance freshness with not hammering CLOB on every reload.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const tokenId = url.searchParams.get("tokenId");
  if (!tokenId) {
    return NextResponse.json(
      { error: "tokenId query param required" },
      { status: 400 },
    );
  }

  try {
    const book = await fetchPolymarketOrderBook(tokenId);
    return NextResponse.json(book, {
      headers: {
        "cache-control": "public, s-maxage=4, stale-while-revalidate=15",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch order book" },
      { status: 502 },
    );
  }
}
