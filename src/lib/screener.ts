import { bucketize } from "./categories";
import { fetchPolymarketMarkets } from "./exchanges/polymarket";
import { fetchKalshiMarkets } from "./exchanges/kalshi";
import { buildSignature, greedyPair } from "./matching";
import type {
  CanonicalMarket,
  ScreenerRow,
  ExchangeQuote,
} from "./exchanges/types";

/**
 * Loads all configured exchanges in parallel and merges them into a single
 * row-per-canonical-market shape ready for the screener UI.
 *
 * Cross-exchange matching uses an entity-aware token signature so questions
 * worded differently across exchanges still pair when they refer to the same
 * underlying event (see lib/matching.ts).
 */
export async function loadScreenerRows(limit = 100): Promise<ScreenerRow[]> {
  const [poly, kalshi] = await Promise.all([
    safe(() => fetchPolymarketMarkets(limit)),
    safe(() => fetchKalshiMarkets(Math.max(limit, 200))),
  ]);

  // Pair Polymarket↔Kalshi using signature similarity.
  const { pairs, unmatchedA, unmatchedB } = greedyPair(
    poly,
    kalshi,
    (m) => buildSignature(m.question),
    0.4,
  );

  const rows: ScreenerRow[] = [];

  // Paired rows — both exchanges contribute
  for (const { aIdx, bIdx } of pairs) {
    const p = poly[aIdx];
    const k = kalshi[bIdx];
    rows.push(buildRow(p, k));
  }

  // Polymarket-only
  for (const i of unmatchedA) {
    rows.push(buildRow(poly[i], null));
  }

  // Kalshi-only
  for (const j of unmatchedB) {
    rows.push(buildRow(null, kalshi[j]));
  }

  // Drop rows where neither side has a real price.
  const useful = rows.filter(
    (r) =>
      typeof r.polymarket?.yesPrice === "number" ||
      typeof r.kalshi?.yesPrice === "number",
  );

  useful.sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0));
  return useful;
}

function buildRow(
  p: CanonicalMarket | null,
  k: CanonicalMarket | null,
): ScreenerRow {
  // Prefer Polymarket as the canonical row identity when both exist —
  // its questions tend to be more readable.
  const ref = p ?? k!;
  const polyQuote = toQuote(p);
  const kalshiQuote = toQuote(k);

  const yesPrices = [polyQuote?.yesPrice, kalshiQuote?.yesPrice].filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  );
  const spread =
    yesPrices.length >= 2
      ? Math.max(...yesPrices) - Math.min(...yesPrices)
      : null;

  const volumes = [polyQuote?.volume24h, kalshiQuote?.volume24h].filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  );
  const totalVol = volumes.length ? volumes.reduce((a, b) => a + b, 0) : null;

  return {
    id: `${ref.exchange}-${ref.externalId}`,
    question: ref.question,
    bucket: bucketize(ref.category, ref.question),
    rawCategory: ref.category,
    closesAt: ref.closesAt,
    volume24h: totalVol,
    liquidity: ref.liquidity ?? null,
    polymarket: polyQuote,
    kalshi: kalshiQuote,
    polymarketYesTokenId: p?.yesTokenId ?? null,
    spread,
  };
}

function toQuote(m: CanonicalMarket | null): ExchangeQuote | null {
  if (!m) return null;
  return {
    yesPrice: m.yesPrice,
    noPrice: m.noPrice,
    url: m.externalUrl,
    volume24h: m.volume24h,
  };
}

async function safe<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch (e) {
    console.error("[screener] fetch failed:", e);
    return [];
  }
}
