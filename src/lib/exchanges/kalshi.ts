import type {
  CanonicalMarket,
  SiblingMarket,
  TradeEvent,
} from "./types";

/**
 * Kalshi public market discovery.
 *
 * We fetch /events?with_nested_markets=true&status=open and paginate via
 * cursor. Multi-candidate events (Pope, JP Morgan CEO, Eurovision winner)
 * collapse to a single canonical market: the leading candidate is primary,
 * the rest live in `siblings` for the detail panel to render.
 *
 * Read-only — no auth needed. KALSHI_API_KEY_ID + KALSHI_PRIVATE_KEY will
 * be wired later for trade feed + balances.
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

const PAGE_SIZE = 200;
const MAX_PAGES = 8;

export async function fetchKalshiMarkets(
  limit = 2000,
): Promise<CanonicalMarket[]> {
  const events: KalshiEvent[] = [];
  let cursor = "";

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(`${KALSHI_BASE}/events`);
    url.searchParams.set("limit", String(PAGE_SIZE));
    url.searchParams.set("status", "open");
    url.searchParams.set("with_nested_markets", "true");
    if (cursor) url.searchParams.set("cursor", cursor);

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        next: { revalidate: 30 },
        headers: { accept: "application/json" },
      });
    } catch {
      break;
    }
    if (!res.ok) break;

    const data = (await res.json()) as EventsResponse;
    const page_events = data.events ?? [];
    events.push(...page_events);
    cursor = data.cursor ?? "";
    if (!cursor || page_events.length < PAGE_SIZE) break;
    if (events.length >= limit) break;
  }

  const out: CanonicalMarket[] = [];
  for (const ev of events) {
    const canonical = eventToCanonical(ev);
    if (canonical) out.push(canonical);
  }
  return out;
}

/**
 * Collapse a Kalshi event into a single canonical market. For binary
 * (yes/no) events the canonical IS the single market. For multi-candidate
 * events we pick the highest-probability candidate as primary and stash
 * the rest as siblings.
 */
function eventToCanonical(ev: KalshiEvent): CanonicalMarket | null {
  const subs = (ev.markets ?? []).filter((m) => {
    if (m.strike_type === "custom") return false;
    if (m.mve_selected_legs && m.mve_selected_legs.length > 0) return false;
    if (!m.ticker) return false;
    return true;
  });
  if (subs.length === 0) return null;

  // Build (market, derivedPrice) pairs, filter out unpriced ones
  type Priced = { m: KalshiMarket; price: number };
  const priced: Priced[] = [];
  for (const m of subs) {
    const p = derivePrice(m);
    if (p === null) continue;
    if (p <= 0.001 || p >= 0.999) continue;
    priced.push({ m, price: p });
  }
  if (priced.length === 0) return null;

  // Sort by descending probability — leader first
  priced.sort((a, b) => b.price - a.price);
  const leader = priced[0];
  const rest = priced.slice(1);

  const eventCategory =
    ev.category ?? deriveCategoryFromTicker(ev.series_ticker ?? ev.event_ticker);
  const eventTitle = ev.title?.trim() ?? "";

  const useEventTitle = subs.length > 1 && eventTitle.length > 0;
  const leaderLabel = (leader.m.yes_sub_title ?? "").trim();
  const question = useEventTitle
    ? eventTitle
    : leader.m.title?.trim() ||
      (eventTitle && leaderLabel ? `${eventTitle} — ${leaderLabel}` : eventTitle || leaderLabel || leader.m.ticker);

  const externalUrl = `https://kalshi.com/markets/${ev.event_ticker.toLowerCase()}`;

  // Aggregate volume across all sub-markets so multi-candidate events
  // reflect their actual interest rather than just the leader's slice.
  let totalVol24h = 0;
  let anyVol = false;
  for (const { m } of priced) {
    const v = parseDollar(m.volume_24h_fp);
    if (v !== null) { totalVol24h += v; anyVol = true; }
  }
  let totalLiq = 0;
  let anyLiq = false;
  for (const { m } of priced) {
    const v = parseDollar(m.liquidity_dollars);
    if (v !== null) { totalLiq += v; anyLiq = true; }
  }

  const siblings: SiblingMarket[] | undefined = rest.length > 0
    ? rest.map(({ m, price }) => ({
        label:
          (m.yes_sub_title ?? "").trim() ||
          (m.title ?? "").trim() ||
          m.ticker,
        externalId: m.ticker,
        externalUrl,
        yesPrice: price,
        noPrice: 1 - price,
        volume24h: parseDollar(m.volume_24h_fp),
      }))
    : undefined;

  return {
    exchange: "KALSHI",
    externalId: ev.event_ticker,
    externalUrl,
    question,
    category: leader.m.category ?? eventCategory ?? null,
    yesPrice: leader.price,
    noPrice: 1 - leader.price,
    volume24h: anyVol ? totalVol24h : null,
    liquidity: anyLiq ? totalLiq : null,
    closesAt: leader.m.close_time ? new Date(leader.m.close_time) : null,
    isActive: (leader.m.status ?? "").toLowerCase() === "active",
    siblings,
  };
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

export async function fetchKalshiTrades(_opts: {
  limit?: number;
  minSizeUsd?: number;
}): Promise<TradeEvent[]> {
  return [];
}
