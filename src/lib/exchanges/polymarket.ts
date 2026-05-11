import type { CanonicalMarket, TradeEvent } from "./types";

/**
 * Polymarket Gamma API — public market metadata.
 * Docs: https://docs.polymarket.com/developers/gamma-markets-api
 */
const GAMMA_BASE = "https://gamma-api.polymarket.com";
/** Polymarket Data API — recent trades. */
const DATA_BASE = "https://data-api.polymarket.com";

type GammaMarket = {
  id: string;
  slug: string;
  question: string;
  description?: string;
  category?: string;
  active?: boolean;
  closed?: boolean;
  outcomePrices?: string;
  outcomes?: string;
  volume24hr?: string | number;
  liquidity?: string | number;
  endDate?: string;
  /** JSON-encoded array ["yesTokenId","noTokenId"] used to fetch CLOB price history */
  clobTokenIds?: string;
};

function safeNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

function parseJsonArray(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export async function fetchPolymarketMarkets(
  limit = 50,
): Promise<CanonicalMarket[]> {
  const url = new URL(`${GAMMA_BASE}/markets`);
  url.searchParams.set("active", "true");
  url.searchParams.set("closed", "false");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("order", "volume24hr");
  url.searchParams.set("ascending", "false");

  const res = await fetch(url.toString(), {
    next: { revalidate: 30 },
    headers: { accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(
      `Polymarket gamma API returned ${res.status}: ${await res.text().catch(() => "")}`,
    );
  }

  const data = (await res.json()) as GammaMarket[];

  return data.map<CanonicalMarket>((m) => {
    const prices = parseJsonArray(m.outcomePrices).map((p) => parseFloat(p));
    const outcomes = parseJsonArray(m.outcomes);

    const yesIdx = outcomes.findIndex((o) => /yes/i.test(o));
    const noIdx = outcomes.findIndex((o) => /no/i.test(o));

    const yesPrice =
      yesIdx >= 0 && Number.isFinite(prices[yesIdx])
        ? prices[yesIdx]
        : Number.isFinite(prices[0])
          ? prices[0]
          : null;
    const noPrice =
      noIdx >= 0 && Number.isFinite(prices[noIdx])
        ? prices[noIdx]
        : Number.isFinite(prices[1])
          ? prices[1]
          : null;

    const tokenIds = parseJsonArray(m.clobTokenIds);
    const yesTokenId = tokenIds[0] ?? null;
    const noTokenId = tokenIds[1] ?? null;

    return {
      exchange: "POLYMARKET",
      externalId: m.id,
      externalUrl: `https://polymarket.com/event/${m.slug}`,
      question: m.question,
      category: m.category ?? null,
      yesPrice,
      noPrice,
      volume24h: safeNumber(m.volume24hr),
      liquidity: safeNumber(m.liquidity),
      closesAt: m.endDate ? new Date(m.endDate) : null,
      isActive: m.active === true && m.closed !== true,
      yesTokenId,
      noTokenId,
    };
  });
}

// ============ Price history (CLOB) ============

const CLOB_BASE = "https://clob.polymarket.com";

export type PricePoint = { t: number; p: number };

/**
 * Fetch a price history series for a Polymarket YES outcome token.
 * `interval` controls the granularity Polymarket returns.
 */
export async function fetchPolymarketPriceHistory(opts: {
  tokenId: string;
  interval?: "1h" | "6h" | "1d" | "1w" | "1m" | "max";
  fidelity?: number;
}): Promise<PricePoint[]> {
  const url = new URL(`${CLOB_BASE}/prices-history`);
  url.searchParams.set("market", opts.tokenId);
  url.searchParams.set("interval", opts.interval ?? "1d");
  if (opts.fidelity) url.searchParams.set("fidelity", String(opts.fidelity));

  const res = await fetch(url.toString(), {
    next: { revalidate: 60 },
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Polymarket price-history returned ${res.status}`);
  }
  const json = (await res.json()) as { history?: Array<{ t: number; p: number }> };
  return json.history ?? [];
}

// ============ Trades / Order Flow ============

type RawTrade = {
  transactionHash?: string;
  timestamp?: number; // unix seconds
  market?: string; // condition id
  asset?: string; // YES or NO token id
  outcome?: string; // "Yes" / "No"
  side?: "BUY" | "SELL" | string;
  price?: number | string;
  size?: number | string; // shares
  taker?: string;
  marketSlug?: string;
  marketName?: string;
  question?: string;
  title?: string;
  slug?: string;
};

/**
 * Fetch recent large trades from Polymarket. Returns oldest→newest order
 * collapsed to the configured limit. Filtering by minimum size USD.
 */
export async function fetchPolymarketTrades(opts: {
  limit?: number;
  minSizeUsd?: number;
}): Promise<TradeEvent[]> {
  const limit = opts.limit ?? 100;
  const url = new URL(`${DATA_BASE}/trades`);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("takerOnly", "true");
  if (opts.minSizeUsd) {
    url.searchParams.set("filterType", "CASH");
    url.searchParams.set("filterAmount", String(opts.minSizeUsd));
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: 10 },
    headers: { accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Polymarket trades API returned ${res.status}`);
  }

  // The API returns either a list directly or { trades: [...] } depending on endpoint version
  const json = (await res.json()) as RawTrade[] | { trades?: RawTrade[] };
  const raw: RawTrade[] = Array.isArray(json) ? json : (json.trades ?? []);

  const out: TradeEvent[] = [];
  for (const t of raw) {
    const price = safeNumber(t.price);
    const size = safeNumber(t.size);
    if (price === null || size === null) continue;
    const sizeUsd = price * size;
    if (opts.minSizeUsd && sizeUsd < opts.minSizeUsd) continue;
    const ts = t.timestamp ? new Date(t.timestamp * 1000) : new Date();
    const question =
      t.question ?? t.marketName ?? t.title ?? t.marketSlug ?? "Unknown market";
    const slug = t.slug ?? t.marketSlug ?? "";
    out.push({
      id: t.transactionHash ?? `${ts.getTime()}-${Math.random()}`,
      timestamp: ts,
      exchange: "POLYMARKET",
      marketId: t.market ?? slug,
      marketQuestion: question,
      marketUrl: slug ? `https://polymarket.com/event/${slug}` : "https://polymarket.com",
      side: t.side === "SELL" ? "SELL" : "BUY",
      outcome: /no/i.test(t.outcome ?? "") ? "NO" : "YES",
      sizeUsd,
      price,
    });
  }

  out.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return out;
}
