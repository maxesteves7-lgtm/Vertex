import { NextResponse } from "next/server";

/**
 * GET /api/status
 *
 * Live-checks the external services Futurist depends on and returns a
 * per-service {status, latencyMs, checkedAt} report. Consumed by the
 * public /status page. Cache-controlled at 30s so a stampede of viewers
 * doesn&rsquo;t hammer upstream APIs.
 *
 * We intentionally check lightweight endpoints:
 *  - Polymarket Gamma /events?limit=1
 *  - Kalshi /markets?limit=1
 *  - FRED /series/observations?series_id=DGS10&limit=1 (only if key set)
 *  - Gemini generateContent ping is skipped (costs quota) — we assume up
 *  - Neon Postgres — attempt a `SELECT 1`
 *  - Supabase Auth /health
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Health = "operational" | "degraded" | "down" | "unknown";
type Row = {
  name: string;
  status: Health;
  latencyMs: number | null;
  note?: string;
};

async function timedFetch(
  url: string,
  init?: RequestInit,
  timeoutMs = 5000,
): Promise<{ ok: boolean; latencyMs: number; status: number | null }> {
  const started = Date.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      cache: "no-store",
    });
    return { ok: r.ok, latencyMs: Date.now() - started, status: r.status };
  } catch {
    return { ok: false, latencyMs: Date.now() - started, status: null };
  } finally {
    clearTimeout(t);
  }
}

function classify(ok: boolean, latencyMs: number): Health {
  if (!ok) return "down";
  if (latencyMs > 2500) return "degraded";
  return "operational";
}

async function checkPolymarket(): Promise<Row> {
  const r = await timedFetch("https://gamma-api.polymarket.com/events?limit=1");
  return {
    name: "Polymarket (data)",
    status: classify(r.ok, r.latencyMs),
    latencyMs: r.latencyMs,
    note: r.status ? `HTTP ${r.status}` : "network error",
  };
}

async function checkKalshi(): Promise<Row> {
  const r = await timedFetch(
    "https://api.elections.kalshi.com/trade-api/v2/markets?limit=1",
  );
  return {
    name: "Kalshi (data)",
    status: classify(r.ok, r.latencyMs),
    latencyMs: r.latencyMs,
    note: r.status ? `HTTP ${r.status}` : "network error",
  };
}

async function checkFred(): Promise<Row> {
  const key = process.env.FRED_API_KEY;
  if (!key) {
    return {
      name: "FRED (macro)",
      status: "unknown",
      latencyMs: null,
      note: "not configured",
    };
  }
  const r = await timedFetch(
    `https://api.stlouisfed.org/fred/series/observations?series_id=DGS10&limit=1&api_key=${key}&file_type=json`,
  );
  return {
    name: "FRED (macro)",
    status: classify(r.ok, r.latencyMs),
    latencyMs: r.latencyMs,
    note: r.status ? `HTTP ${r.status}` : "network error",
  };
}

async function checkSupabase(): Promise<Row> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    return {
      name: "Supabase (auth)",
      status: "unknown",
      latencyMs: null,
      note: "not configured",
    };
  }
  const r = await timedFetch(`${url}/auth/v1/health`);
  return {
    name: "Supabase (auth)",
    status: classify(r.ok, r.latencyMs),
    latencyMs: r.latencyMs,
    note: r.status ? `HTTP ${r.status}` : "network error",
  };
}

async function checkDatabase(): Promise<Row> {
  const started = Date.now();
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - started;
    return {
      name: "Database (Neon)",
      status: classify(true, latency),
      latencyMs: latency,
    };
  } catch (e) {
    return {
      name: "Database (Neon)",
      status: "down",
      latencyMs: Date.now() - started,
      note: e instanceof Error ? e.message.slice(0, 80) : "query failed",
    };
  }
}

export async function GET() {
  const [poly, kalshi, fred, supa, db] = await Promise.all([
    checkPolymarket(),
    checkKalshi(),
    checkFred(),
    checkSupabase(),
    checkDatabase(),
  ]);

  const services: Row[] = [poly, kalshi, fred, supa, db];
  const overall: Health = services.some((s) => s.status === "down")
    ? "down"
    : services.some((s) => s.status === "degraded")
      ? "degraded"
      : services.every((s) => s.status === "unknown")
        ? "unknown"
        : "operational";

  return NextResponse.json(
    {
      overall,
      checkedAt: new Date().toISOString(),
      services,
    },
    {
      // 30s edge cache — plenty fresh for a status page, protects upstreams
      headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=60" },
    },
  );
}
