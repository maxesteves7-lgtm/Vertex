import type { CanonicalMarket, TradeEvent } from "./types";

/**
 * Kalshi public market discovery.
 *
 * The /markets endpoint on Kalshi defaults to returning their multivariate
 * combo bets (strike_type === "custom") which are weird parlays that don't
 * map to Polymarket questions at all. To get the real binary markets we
 * fetch /events?with_nested_markets=true and unpack the markets from each
 * event.
 *
 * Read-only — no auth needed. KALSHI_API_KEY_ID + KALSHI_PRIVATE_KEY will
 * be wired later for trade-feed + balances.
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
  mve_selected_legs?: unknown[];

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

type KalshiEvent = {
  event_ticker: string;
  series_ticker?: string;
  title?: string;
  sub_title?: string;
  category?: string;
  status?: string;
  markets?: KalshiMarket[];
};

type EventsResponse = {
  events?: KalshiEvent[];
  cursor?: string;
};

export async function fetchKalshiMarkets(
  limit = 200,
): Promise<CanonicalMarket[]> {
  const url = new URL(`${KALSHI_BASE}/events`);
  url.searchParams.set("limit", String(Math.min(limit, 200)));
  url.searchParams.set("status", "open");
  url.searchParams.set("with_nested_markets", "true");

  const res = await fetch(url.toString(), {
    next: { revalidate: 30 },
    headers: { accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Kalshi events API returned ${res.status}`);
  }

  const data = (await res.json()) as EventsResponse;
  const events = data.events ?? [];

  // Flatten markets out of every event, keeping the event-level category/title
  // available so we can label and link correctly.
  const out: CanonicalMarket[] = [];
  for (const ev of events) {
    const eventCategory = ev.category ?? deriveCategoryFromTicker(ev.series_ticker ?? ev.event_ticker);
    const eventTitle = ev.title ?? "";
    const markets = ev.markets ?? [];

    for (const m of markets) {
      // Skip multivariate combo bets that occasionally leak in via events too.
      if (m.strike_type === "custom") continue;
      if (m.mve_selected_legs && m.mve_selected_legs.length > 0) continue;
      if (!m.ticker) continue;

      const yesPrice = derivePrice(m);
      if (yesPrice === null) continue;
      // Skip degenerate quotes (perfectly 0 or 1).
      if (yesPrice <= 0.001 || yesPrice >= 0.999) continue;

      const noPrice = 1 - yesPrice;
      const externalUrl = `https://kalshi.com/markets/${ev.event_ticker.toLowerCase()}`;

      // Build a unique, readable question. Many Kalshi events have multiple
      // child markets that share the parent title ("Who will the next Pope
      // be?") and rely on yes_sub_title for the candidate. We always append
      // the subtitle when it adds new info, so the screener doesn't dedupe
      // sibling markets into a single row.
      const yesSub = (m.yes_sub_title ?? "").trim();
      const titleBase = (m.title ?? eventTitle ?? "").trim();
      const subAddsInfo =
        yesSub.length > 0 &&
        yesSub.toLowerCase() !== "yes" &&
        !titleBase.toLowerCase().includes(yesSub.toLowerCase());
      const question = subAddsInfo
        ? titleBase
          ? `${titleBase} — ${yesSub}`
          : yesSub
        : titleBase || yesSub || m.ticker;

      out.push({
        exchange: "KALSHI",
        externalId: m.ticker,
        externalUrl,
        question,
        category: m.category ?? eventCategory ?? null,
        yesPrice,
        noPrice,
        volume24h: parseDollar(m.volume_24h_fp),
        liquidity: parseDollar(m.liquidity_dollars),
        closesAt: m.close_time ? new Date(m.close_time) : null,
        isActive: (m.status ?? "").toLowerCase() === "active",
      });
    }
  }

  return out;
}

function derivePrice(m: KalshiMarket): number | null {
  const yesBid = parseDollar(m.yes_bid_dollars);
  const yesAsk = parseDollar(m.yes_ask_dollars);
  const last = parseDollar(m.last_price_dollars);

  if (yesBid !== null && yesAsk !== null && yesBid + yesAsk > 0) {
    return clamp01((yesBid + yesAsk) / 2);
  }
  if (last !== null && last > 0) return clamp01(last);
  if (yesAsk !== null && yesAsk > 0 && yesAsk < 1) return clamp01(yesAsk);
  return null;
}

/** Bucket hint from series/event tickers like KXNBAGAME, KXBTC, KXFED. */
function deriveCategoryFromTicker(ticker: string | undefined | null): string | null {
  if (!ticker) return null;
  const u = ticker.toUpperCase();
  if (/^KX(NBA|MLB|NFL|NHL|UFC|MMA|TENNIS|GOLF|MASTERS|F1|NASCAR|CFB|NCAA|EPL|UCL|FIFA|SPORT)/.test(u))
    return "Sports";
  if (/^KX(BTC|ETH|SOL|CRYPTO|COIN)/.test(u)) return "Crypto";
  if (/^KX(FED|CPI|INF|GDP|JOBS|UNEMP|GAS|OIL|MORT|HOUSE|TREAS|RECESS)/.test(u))
    return "Macro";
  if (/^KX(PRES|SEN|GOV|TRUMP|BIDEN|HARRIS|GOP|DEM|ELECTION|POLITIC)/.test(u))
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
