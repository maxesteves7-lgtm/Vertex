import { bucketize } from "./categories";
import { fetchPolymarketMarkets } from "./exchanges/polymarket";
import { fetchKalshiMarkets } from "./exchanges/kalshi";
import type {
  CanonicalMarket,
  ScreenerRow,
  ExchangeQuote,
} from "./exchanges/types";

/**
 * Loads all configured exchanges in parallel and merges them into a single
 * row-per-canonical-market shape ready for the screener UI.
 *
 * Cross-exchange matching uses a normalized question key for now; will
 * upgrade to entity-aware matching when more exchanges come online.
 */
export async function loadScreenerRows(limit = 100): Promise<ScreenerRow[]> {
  const [poly, kalshi] = await Promise.all([
    safe(() => fetchPolymarketMarkets(limit)),
    safe(() => fetchKalshiMarkets(limit)),
  ]);

  const polyByKey = indexByQuestion(poly);
  const kalshiByKey = indexByQuestion(kalshi);

  const allKeys = new Set<string>([
    ...polyByKey.keys(),
    ...kalshiByKey.keys(),
  ]);

  const rows: ScreenerRow[] = [];
  for (const key of allKeys) {
    const p = polyByKey.get(key) ?? null;
    const k = kalshiByKey.get(key) ?? null;
    const ref = p ?? k;
    if (!ref) continue;

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

    rows.push({
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
    });
  }

  // Drop rows where no exchange surfaced a usable price — they're noise.
  const useful = rows.filter(
    (r) =>
      typeof r.polymarket?.yesPrice === "number" ||
      typeof r.kalshi?.yesPrice === "number",
  );

  useful.sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0));
  return useful;
}

function indexByQuestion(
  list: CanonicalMarket[],
): Map<string, CanonicalMarket> {
  const map = new Map<string, CanonicalMarket>();
  for (const m of list) map.set(normalizeQuestion(m.question), m);
  return map;
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

function normalizeQuestion(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function safe<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch (e) {
    console.error("[screener] fetch failed:", e);
    return [];
  }
}
