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
  /** 24h YES-price change as a signed decimal (e.g. +0.07 = +7pp). */
  priceChange24h?: number | null;
  yesTokenId?: string | null;
  noTokenId?: string | null;
  /**
   * For multi-candidate events (e.g. "Who will be the next CEO of JP Morgan
   * Chase?"), this canonical market represents the leading candidate. The
   * remaining candidates live here so the detail panel can show all options.
   */
  siblings?: SiblingMarket[];
};

export type SiblingMarket = {
  /** Candidate name / outcome label, e.g. "Marianne Lake" */
  label: string;
  externalId: string;
  externalUrl: string;
  yesPrice: number | null;
  noPrice: number | null;
  volume24h: number | null;
};

export type ExchangeQuote = {
  yesPrice: number | null;
  noPrice: number | null;
  url: string;
  volume24h: number | null;
  /** 24h YES-price change as a signed decimal. */
  priceChange24h?: number | null;
  /** Candidates for multi-outcome events — shown in detail panel. */
  siblings?: SiblingMarket[];
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
  summary?: string;
  affectedMarketIds: string[];
  priceImpact?: number;
};
