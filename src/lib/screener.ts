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
 * Loads all configured exchanges in parallel, pairs markets across them via
 * the entity-aware signature matcher, and returns rows sorted with the
 * matched-on-both rows pinned to the top (those are the interesting ones —
 * they're the only places spread/arbitrage is meaningful).
 */
export async function loadScreenerRows(_unused = 500): Promise<ScreenerRow[]> {
  const [poly, kalshi] = await Promise.all([
    safe(() => fetchPolymarketMarkets(3000)),
    safe(() => fetchKalshiMarkets(5000)),
  ]);

  const { pairs, unmatchedA, unmatchedB } = greedyPair(
    poly,
    kalshi,
    (m) => buildSignature(m.question),
    0.4,
  );

  const rows: ScreenerRow[] = [];

  for (const { aIdx, bIdx } of pairs) {
    rows.push(buildRow(poly[aIdx], kalshi[bIdx]));
  }
  for (const i of unmatchedA) {
    rows.push(buildRow(poly[i], null));
  }
  for (const j of unmatchedB) {
    rows.push(buildRow(null, kalshi[j]));
  }

  // Show every active event. We only drop ones that have already closed —
  // the user asked explicitly that nothing past its end-date appears.
  // Price-less events still come through; the card just shows "—".
  const now = Date.now();
  const useful = rows.filter((r) => {
    if (r.closesAt && r.closesAt.getTime() <= now) return false;
    return true;
  });

  // Matched-on-both rows pin to top. Within each group, sort by
  // spread desc (interesting arbs first), then by total volume desc.
  useful.sort((a, b) => {
    const aBoth = !!a.polymarket && !!a.kalshi ? 1 : 0;
    const bBoth = !!b.polymarket && !!b.kalshi ? 1 : 0;
    if (aBoth !== bBoth) return bBoth - aBoth;
    if (aBoth === 1 && bBoth === 1) {
      const sd = (b.spread ?? 0) - (a.spread ?? 0);
      if (sd !== 0) return sd;
    }
    return (b.volume24h ?? 0) - (a.volume24h ?? 0);
  });

  return useful;
}

function buildRow(
  p: CanonicalMarket | null,
  k: CanonicalMarket | null,
): ScreenerRow {
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
    siblings: m.siblings,
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
