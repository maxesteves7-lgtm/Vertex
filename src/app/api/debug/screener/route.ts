import { NextResponse } from "next/server";
import { fetchPolymarketMarkets } from "@/lib/exchanges/polymarket";
import { fetchKalshiMarkets } from "@/lib/exchanges/kalshi";

/**
 * Diagnostic — runs each exchange adapter and returns counts +
 * a few sample normalized markets. Visit:
 *   /api/debug/screener
 */
export async function GET() {
  const [poly, kalshi] = await Promise.all([
    fetchPolymarketMarkets(120).catch((e) => ({
      error: e instanceof Error ? e.message : String(e),
    })),
    fetchKalshiMarkets(200).catch((e) => ({
      error: e instanceof Error ? e.message : String(e),
    })),
  ]);

  return NextResponse.json({
    polymarket: Array.isArray(poly)
      ? { count: poly.length, sample: poly.slice(0, 3) }
      : poly,
    kalshi: Array.isArray(kalshi)
      ? { count: kalshi.length, sample: kalshi.slice(0, 5) }
      : kalshi,
  });
}
