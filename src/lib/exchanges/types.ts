import type { Category } from "../categories";

export type ExchangeId = "POLYMARKET" | "KALSHI";
export const EXCHANGE_IDS: ExchangeId[] = ["POLYMARKET", "KALSHI"];

/**
 * Canonical shape that every exchange adapter normalizes its markets into.
 */
export type CanonicalMarket = {
  exchange: ExchangeId;
  externalId: string;
  externalUrl: string;
  question: string;
  category: string | null;
  /** Probability the market resolves YES, expressed as 0..1 */
  yesPrice: number | null;
  noPrice: number | null;
  volume24h: number | null;
  liquidity: number | null;
  closesAt: Date | null;
  isActive: boolean;
  /** Exchange-native token IDs (Polymarket uses CLOB token IDs for price history) */
  yesTokenId?: string | null;
  noTokenId?: string | null;
};

export type ExchangeQuote = {
  yesPrice: number | null;
  noPrice: number | null;
  url: string;
  volume24h: number | null;
};

/**
 * Screener-ready row produced by the page-level loader: a canonical
 * market with cross-exchange columns merged in (when matches exist) and
 * derived fields like spread + bucketized category.
 */
export type ScreenerRow = {
  id: string;
  question: string;
  bucket: Category;
  rawCategory: string | null;
  closesAt: Date | null;
  volume24h: number | null;
  liquidity: number | null;
  polymarket: ExchangeQuote | null;
  kalshi: ExchangeQuote | null;
  /** Polymarket YES outcome CLOB token ID (used to fetch price history) */
  polymarketYesTokenId: string | null;
  /** Max - min of YES prices across listed exchanges (0..1), null if <2 quotes */
  spread: number | null;
};

/** Recent trade event surfaced in the order-flow tape */
export type TradeEvent = {
  id: string;
  timestamp: Date;
  exchange: ExchangeId;
  marketId: string;
  marketQuestion: string;
  marketUrl: string;
  side: "BUY" | "SELL";
  outcome: "YES" | "NO";
  /** Notional size in USD */
  sizeUsd: number;
  /** Trade price as 0..1 probability */
  price: number;
};

/** News item linked to one or more affected markets */
export type NewsItem = {
  id: string;
  timestamp: Date;
  source: string;
  headline: string;
  url: string;
  /** Free-text body or summary (optional) */
  summary?: string;
  /** IDs of canonical screener rows this item likely affects */
  affectedMarketIds: string[];
  /** YES-price delta caused by this news, if measurable (0..1, signed) */
  priceImpact?: number;
};
