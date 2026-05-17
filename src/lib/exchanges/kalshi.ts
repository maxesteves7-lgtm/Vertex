import type { CanonicalMarket, TradeEvent } from "./types";

/**
 * Kalshi public market discovery — read-only endpoints don't require auth.
 * Docs: https://trading-api.readme.io/reference/getmarkets
 *
 * Notes on the response shape (as of 2026):
 * - Prices are dollar strings (e.g. "0.3030") not cent ints.
 * - "Multivariate" combo bets (with mve_selected_legs) come through this
 *   endpoint too; we filter them out — they don't map to Polymarket markets.
 * - For authenticated endpoints (trading, balances) we'll add RSA-signed
 *   requests later when KALSHI_API_KEY_ID + KALSHI_PRIVATE_KEY are set.
 */
const KALSHI_BASE = "https://api.elections.kalshi.com/trade-api/v2";

type KalshiMarket = {
  ticker: string;
  event_ticker?: string;
  market_type?: string;
  title?: string;
  yes_sub_title?: string;
  no_sub_title?: string;
  category?: string;
  status?: string;
  strike_type?: string;
  /** Multivariate event component list — present on combo bets. */
  mve_selected_legs?: unknown[];

  // New dollar-string fields
  yes_bid_dollars?: string;
  yes_ask_dollars?: string;
  no_bid_dollars?: string;
  no_ask_dollars?: string;
  last_price_dollars?: string;
  volume_fp?: string;
  volume_24h_fp?: string;
  liquidity_dollars?: string;
  open_interest_fp?: string;

  close_time?: string;
  expiration_time?: string;
};

type KalshiResponse = {
  markets?: KalshiMarket[];
  cursor?: string;
};

export async function fetchKalshiMarkets(
  limit = 200,
): Promise<CanonicalMarket[]> {
  const pageSize = Math.min(limit, 1000);
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
    // Skip multivariate combo bets — strange products that don't map cross-exchange
    .filter(
      (m) =>
        (!m.mve_selected_legs || m.mve_selected_legs.length === 0) &&
        m.strike_type !== "custom",
    )
    .map<CanonicalMarket>((m) => {
      // Kalshi dollar prices already are 0..1 (contract pays $1 on resolution).
      const yesBid = parseDollar(m.yes_bid_dollars);
      const yesAsk = parseDollar(m.yes_ask_dollars);
      const last = parseDollar(m.last_price_dollars);

      let yesPrice: number | null = null;
      if (yesBid !== null && yesAsk !== null && yesBid + yesAsk > 0) {
        // Mid of bid/ask is the cleanest fair-value estimate.
        yesPrice = (yesBid + yesAsk) / 2;
      } else if (last !== null && last > 0) {
        yesPrice = last;
      } else if (yesAsk !== null && yesAsk > 0 && yesAsk < 1) {
        // Fall back to ask if only one side is quoted.
        yesPrice = yesAsk;
      }
      yesPrice = yesPrice !== null ? clamp01(yesPrice) : null;
      const noPrice = yesPrice !== null ? 1 - yesPrice : null;

      const eventTicker = m.event_ticker ?? m.ticker.split("-")[0];
      const externalUrl = `https://kalshi.com/markets/${eventTicker.toLowerCase()}`;

      return {
        exchange: "KALSHI",
        externalId: m.ticker,
        externalUrl,
        question: m.title!,
        category: m.category ?? deriveCategoryFromTicker(m.ticker),
        yesPrice,
        noPrice,
        volume24h: parseDollar(m.volume_24h_fp),
        liquidity: parseDollar(m.liquidity_dollars),
        closesAt: m.close_time ? new Date(m.close_time) : null,
        isActive: (m.status ?? "").toLowerCase() === "active",
      };
    })
    // Just require a meaningful price — Kalshi markets often show
    // 0 volume_24h even when they're real. The screener already drops
    // markets with no price on either exchange.
    .filter(
      (m) =>
        m.yesPrice !== null && m.yesPrice > 0.001 && m.yesPrice < 0.999,
    );
}

/** Many Kalshi tickers start with KX<CATEGORY> — we use that as a hint. */
function deriveCategoryFromTicker(ticker: string): string | null {
  const u = ticker.toUpperCase();
  if (/^KX(NBA|MLB|NFL|NHL|UFC|MMA|TENNIS|GOLF|MASTERS|F1|NASCAR|CFB|NCAA|EPL|UCL|FIFA)/.test(u))
    return "Sports";
  if (/^KX(BTC|ETH|SOL|CRYPTO|COIN)/.test(u)) return "Crypto";
  if (/^KX(FED|CPI|INF|GDP|JOBS|UNEMP|GAS|OIL|MORT|HOUSE|TREAS)/.test(u))
    return "Macro";
  if (/^KX(PRES|SEN|HOUSE|GOV|TRUMP|BIDEN|HARRIS|GOP|DEM)/.test(u))
    return "Politics";
  if (/^KX(AI|GPT|OPENAI|NVDA|TESLA|APPLE|GOOG|MSFT|META|AMZN)/.test(u))
    return "AI/Tech";
  if (/^KX(HUR|TEMP|WEATHER|RAIN|SNOW)/.test(u)) return "Weather";
  if (/^KX(OSCAR|GRAMMY|EMMY|MOVIE|TV|MUSIC|TAYLOR)/.test(u)) return "Culture";
  if (/^KX(PAND|VIRUS|FDA|VAX|HEALTH)/.test(u)) return "Health";
  return null;
}

function parseDollar(s: string | number | undefined | null): number | null {
  if (s === undefined || s === null) return null;
  const n = typeof s === "number" ? s : parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
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
