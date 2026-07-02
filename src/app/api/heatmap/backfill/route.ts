import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  fetchPolymarketMarkets,
  fetchPolymarketPriceHistory,
} from "@/lib/exchanges/polymarket";
import { bucketize } from "@/lib/categories";
import { pool } from "@/lib/correlation";

/**
 * GET /api/heatmap/backfill
 *
 * Nightly job (Vercel cron) that walks the top-volume Polymarket markets,
 * pulls each one's `6h` price history over its full lifetime, and upserts
 * observations into the `PriceObservation` table. The heatmap query route
 * reads out of that table — no live CLOB hits at render time.
 *
 * The route is intentionally idempotent (unique constraint on
 * `(tokenId, observedAt)` catches dupes), so it's safe to hit manually to
 * seed the table before the first cron fires.
 */
export async function GET() {
  const started = Date.now();

  // 1. Pick candidate markets — top-by-volume active Polymarket markets
  //    with a YES token ID (needed for CLOB history).
  let markets;
  try {
    markets = await fetchPolymarketMarkets(200);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "fetch markets failed" },
      { status: 502 },
    );
  }
  const seeds = markets
    .filter((m) => !!m.yesTokenId && typeof m.yesPrice === "number")
    .sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))
    .slice(0, 60);

  if (seeds.length === 0) {
    return NextResponse.json({
      ok: true,
      markets: 0,
      observations: 0,
      elapsedMs: Date.now() - started,
    });
  }

  // 2. Fetch each history in parallel (concurrency 6) and upsert.
  let insertedTotal = 0;
  let processed = 0;
  const failures: Array<{ tokenId: string; reason: string }> = [];

  await pool(seeds, 6, async (m) => {
    if (!m.yesTokenId) return;
    let pts: Array<{ t: number; p: number }> = [];
    try {
      pts = await fetchPolymarketPriceHistory({
        tokenId: m.yesTokenId,
        interval: "6h",
      });
    } catch (e) {
      failures.push({
        tokenId: m.yesTokenId,
        reason: e instanceof Error ? e.message : "history fetch failed",
      });
      return;
    }
    processed++;
    if (pts.length === 0) return;

    // Bucket to top-of-hour (in ms → Date). Multiple ticks in the same
    // hour → keep the last observation (map dedup).
    const perHour = new Map<number, number>();
    for (const pt of pts) {
      const hourMs = Math.floor((pt.t * 1000) / 3600000) * 3600000;
      perHour.set(hourMs, pt.p);
    }

    const category = bucketize(m.category, m.question);
    const rows = Array.from(perHour.entries()).map(([hourMs, price]) => ({
      tokenId: m.yesTokenId!,
      question: m.question,
      category,
      observedAt: new Date(hourMs),
      price,
      volume24h: m.volume24h ?? null,
    }));

    try {
      const res = await prisma.priceObservation.createMany({
        data: rows,
        skipDuplicates: true,
      });
      insertedTotal += res.count;
    } catch (e) {
      failures.push({
        tokenId: m.yesTokenId,
        reason: e instanceof Error ? e.message : "db insert failed",
      });
    }
  });

  return NextResponse.json(
    {
      ok: true,
      markets: processed,
      candidatesPicked: seeds.length,
      inserted: insertedTotal,
      failed: failures.length,
      failures: failures.slice(0, 10),
      elapsedMs: Date.now() - started,
    },
    {
      headers: {
        // Small cache to protect against accidental double-hits
        "cache-control": "public, s-maxage=60, stale-while-revalidate=60",
      },
    },
  );
}
