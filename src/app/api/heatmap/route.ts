import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bucketSeries, pearson } from "@/lib/correlation";

/**
 * GET /api/heatmap?category=<bucket>&window=30d&max=25
 *
 * Reads persisted price observations from `PriceObservation` and computes an
 * N×N Pearson correlation matrix. Everything runs against the DB — no live
 * Polymarket hits — so the query is cheap and cacheable. The heatmap page
 * uses this endpoint.
 *
 * Response:
 *   {
 *     window, category, generatedAt,
 *     markets: Array<{ tokenId, question, category, volume24h }>,
 *     matrix:  number[][]   // NaN where insufficient data
 *   }
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const category = url.searchParams.get("category") ?? "All";
  const windowParam = url.searchParams.get("window") ?? "30d";
  const window: "7d" | "30d" | "90d" =
    windowParam === "7d" || windowParam === "90d" ? windowParam : "30d";
  const maxN = Math.max(
    5,
    Math.min(40, parseInt(url.searchParams.get("max") ?? "25", 10) || 25),
  );

  const spanHours = window === "7d" ? 7 * 24 : window === "90d" ? 90 * 24 : 30 * 24;
  const gridStart = Date.now() - spanHours * 3600 * 1000;
  const gridEnd = Date.now();
  const bucketSize = 3600; // 1 hour

  // 1. Pick which markets to include. Prefer highest 24h volume within the
  //    category (or globally when category === "All").
  const catFilter =
    category === "All" ? undefined : { category };

  // Pull distinct tokenId → (question, latest volume) via a small query
  // grouped in memory.
  const recent = await prisma.priceObservation.findMany({
    where: {
      observedAt: { gte: new Date(gridStart) },
      ...(catFilter ?? {}),
    },
    select: {
      tokenId: true,
      question: true,
      category: true,
      observedAt: true,
      price: true,
      volume24h: true,
    },
    orderBy: { observedAt: "asc" },
  });

  if (recent.length === 0) {
    return NextResponse.json(
      {
        window,
        category,
        markets: [],
        matrix: [],
        generatedAt: new Date().toISOString(),
        empty: true,
      },
      {
        headers: {
          "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  }

  // Group observations per tokenId, capture latest metadata
  type Meta = {
    tokenId: string;
    question: string;
    category: string;
    volume24h: number | null;
  };
  const perToken = new Map<
    string,
    {
      meta: Meta;
      series: Array<{ t: number; p: number }>;
    }
  >();
  for (const r of recent) {
    let entry = perToken.get(r.tokenId);
    if (!entry) {
      entry = {
        meta: {
          tokenId: r.tokenId,
          question: r.question,
          category: r.category,
          volume24h: r.volume24h ?? null,
        },
        series: [],
      };
      perToken.set(r.tokenId, entry);
    } else {
      // Always keep the freshest question / vol snapshot (observations are
      // ordered ascending by observedAt, so overwrite as we go).
      entry.meta.question = r.question;
      entry.meta.category = r.category;
      entry.meta.volume24h = r.volume24h ?? entry.meta.volume24h;
    }
    entry.series.push({
      t: Math.floor(r.observedAt.getTime() / 1000),
      p: r.price,
    });
  }

  // Pick top-N by number of observations (proxy for liquidity + how much
  // signal each row will contribute) then fall back to volume.
  const ranked = Array.from(perToken.values())
    .filter((v) => v.series.length >= 20)
    .sort((a, b) => {
      const bv = b.meta.volume24h ?? 0;
      const av = a.meta.volume24h ?? 0;
      if (bv !== av) return bv - av;
      return b.series.length - a.series.length;
    })
    .slice(0, maxN);

  if (ranked.length < 2) {
    return NextResponse.json(
      {
        window,
        category,
        markets: ranked.map((r) => r.meta),
        matrix: [],
        generatedAt: new Date().toISOString(),
        empty: true,
      },
      {
        headers: {
          "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  }

  // 2. Bucket each series onto the common hourly grid.
  const bucketed = ranked.map((r) =>
    bucketSeries(r.series, Math.floor(gridStart / 1000), Math.floor(gridEnd / 1000), bucketSize),
  );

  // 3. Compute N×N Pearson matrix. Diagonal = 1. Symmetric.
  const N = ranked.length;
  const matrix: number[][] = Array.from({ length: N }, () =>
    new Array<number>(N).fill(0),
  );
  for (let i = 0; i < N; i++) matrix[i][i] = 1;
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const r = pearson(bucketed[i], bucketed[j]);
      const rho = r ? r.rho : NaN;
      matrix[i][j] = rho;
      matrix[j][i] = rho;
    }
  }

  return NextResponse.json(
    {
      window,
      category,
      markets: ranked.map((r) => r.meta),
      matrix,
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "cache-control": "public, s-maxage=300, stale-while-revalidate=1800",
      },
    },
  );
}
