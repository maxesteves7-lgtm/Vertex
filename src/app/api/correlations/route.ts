import { NextResponse } from "next/server";
import { fetchPolymarketPriceHistory } from "@/lib/exchanges/polymarket";
import { bucketSeries, pearson, pool } from "@/lib/correlation";

/**
 * POST /api/correlations
 * Body: {
 *   seed:       string      // Polymarket YES token ID for the seed market
 *   candidates: string[]    // token IDs to score against the seed (max 40)
 *   window?:    "24h"|"7d"|"30d"   // default "7d"
 * }
 *
 * Fetches historical prices from Polymarket CLOB for each token in parallel
 * (with a small concurrency cap), buckets them onto a common hourly grid,
 * and computes Pearson ρ between the seed and each candidate. Any pair with
 * insufficient overlapping data is dropped.
 *
 * Response: {
 *   seed,
 *   window,
 *   correlations: Array<{ tokenId, rho, n }>   // sorted by |rho| desc
 * }
 */
export async function POST(req: Request) {
  let body: {
    seed?: unknown;
    candidates?: unknown;
    window?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const seed = typeof body.seed === "string" ? body.seed : null;
  const rawCandidates = Array.isArray(body.candidates) ? body.candidates : [];
  const candidates = rawCandidates
    .filter((c): c is string => typeof c === "string" && c.length > 0)
    .filter((c) => c !== seed) // don't correlate the seed with itself
    .slice(0, 40);
  const window =
    body.window === "24h" || body.window === "30d" ? body.window : "7d";

  if (!seed) {
    return NextResponse.json(
      { error: "seed (Polymarket token ID) is required" },
      { status: 400 },
    );
  }
  if (candidates.length === 0) {
    return NextResponse.json(
      { seed, window, correlations: [] },
      {
        headers: {
          "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  }

  // Time grid: last N hours, one bucket per hour
  const now = Math.floor(Date.now() / 1000);
  const spanHours = window === "24h" ? 24 : window === "30d" ? 30 * 24 : 7 * 24;
  const gridStart = now - spanHours * 3600;
  const gridEnd = now;
  const bucketSize = 3600; // 1h

  // Polymarket interval hint — finer for shorter windows
  const interval: "1h" | "6h" | "1d" =
    window === "24h" ? "1h" : window === "7d" ? "6h" : "1d";

  // Fetch history for seed + all candidates with concurrency 6
  const allTokens = [seed, ...candidates];
  let seedSeries: Array<number | null> = [];
  const candSeries = new Map<string, Array<number | null>>();

  await pool(allTokens, 6, async (tokenId) => {
    let pts: Array<{ t: number; p: number }> = [];
    try {
      pts = await fetchPolymarketPriceHistory({ tokenId, interval });
    } catch {
      pts = [];
    }
    const bucketed = bucketSeries(pts, gridStart, gridEnd, bucketSize);
    if (tokenId === seed) seedSeries = bucketed;
    else candSeries.set(tokenId, bucketed);
  });

  // Compute correlations
  type Row = { tokenId: string; rho: number; n: number };
  const correlations: Row[] = [];
  for (const tokenId of candidates) {
    const s = candSeries.get(tokenId);
    if (!s) continue;
    const r = pearson(seedSeries, s);
    if (!r) continue;
    correlations.push({ tokenId, rho: r.rho, n: r.n });
  }
  correlations.sort((a, b) => Math.abs(b.rho) - Math.abs(a.rho));

  return NextResponse.json(
    { seed, window, correlations },
    {
      headers: {
        // Correlations shift slowly — 10 min cache with 30 min swr
        "cache-control": "public, s-maxage=600, stale-while-revalidate=1800",
      },
    },
  );
}
