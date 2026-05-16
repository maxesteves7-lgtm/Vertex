import type { CanonicalMarket, TradeEvent } from "./types";

/**
 * Kalshi public market discovery — read-only endpoints don't require auth.
 * Docs: https://trading-api.readme.io/reference/getmarkets
 *
 * For authenticated endpoints (trading, balances) we'll add RSA-signed
 * requests later when KALSHI_API_KEY_ID + KALSHI_PRIVATE_KEY are set.
 */
const KALSHI_BASE = "https://api.elections.kalshi.com/trade-api/v2";

type KalshiMarket = {
  ticker: string;
  event_ticker?: string;
  market_type?: string;
  title?: string;
  subtitle?: string;
  category?: string;
  status?: string;
  /** Bid for the YES side, in cents (0..100). */
  yes_bid?: number;
  yes_ask?: number;
  no_bid?: number;
  no_ask?: number;
  /** Last trade price in cents (0..100). */
  last_price?: number;
  volume?: number;
  volume_24h?: number;
  liquidity?: number;
  open_interest?: number;
  close_time?: string;
  expiration_time?: string;
};

type KalshiResponse = {
  markets?: KalshiMarket[];
  cursor?: string;
};

export async function fetchKalshiMarkets(
  limit = 100,
): Promise<CanonicalMarket[]> {
  // Kalshi caps page size at 1000; we usually want top 100-200
  const pageSize = Math.min(limit, 200);
  const url = new URL(`${KALSHI_BASE}/markets`);
  url.searchParams.set("limit", String(pageSize));
  url.searchParams.set("status", "open");

  const res = await fetch(url.toString(), {
    next: { revalidate: 30 },
    headers: { accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Kalshi API returned ${res.status}`);
  }

  const data = (await res.json()) as KalshiResponse;
  const markets = data.markets ?? [];

  return markets
    .filter((m) => !!m.title && !!m.ticker)
    .map<CanonicalMarket>((m) => {
      // Kalshi prices are cents (0..100). Mid of bid/ask gives a fair YES price;
      // fall back to last_price if quote isn't populated.
      const yesPriceCents = midOrLast(m.yes_bid, m.yes_ask, m.last_price);
      const yesPrice =
        yesPriceCents !== null ? clamp01(yesPriceCents / 100) : null;
      const noPrice = yesPrice !== null ? 1 - yesPrice : null;

      const eventTicker = m.event_ticker ?? m.ticker.split("-")[0];
      const externalUrl = `https://kalshi.com/markets/${eventTicker}/${m.ticker.toLowerCase()}`;

      return {
        exchange: "KALSHI",
        externalId: m.ticker,
        externalUrl,
        question: m.title!,
        category: m.category ?? null,
        yesPrice,
        noPrice,
        volume24h: safeNum(m.volume_24h),
        liquidity: safeNum(m.liquidity),
        closesAt: m.close_time ? new Date(m.close_time) : null,
        isActive: (m.status ?? "").toLowerCase() === "active",
      };
    })
    // Drop quiet markets — no quote, no last trade, no recent volume.
    // These pollute the screener with empty rows.
    .filter((m) => m.yesPrice !== null && (m.volume24h ?? 0) > 0);
}

function midOrLast(
  bid: number | undefined,
  ask: number | undefined,
  last: number | undefined,
): number | null {
  if (typeof bid === "number" && typeof ask === "number") {
    return (bid + ask) / 2;
  }
  if (typeof last === "number") return last;
  return null;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function safeNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

/**
 * Trades feed is authenticated on Kalshi — stub returns empty until we
 * add RSA-signed request flow with KALSHI_API_KEY_ID + KALSHI_PRIVATE_KEY.
 */
export async function fetchKalshiTrades(_opts: {
  limit?: number;
  minSizeUsd?: number;
}): Promise<TradeEvent[]> {
  return [];
}
