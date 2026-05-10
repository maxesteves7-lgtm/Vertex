import type { CanonicalMarket, TradeEvent } from "./types";

/**
 * Kalshi adapter — placeholder until API credentials are provided.
 * When KALSHI_API_KEY_ID and KALSHI_API_PRIVATE_KEY are set in env,
 * this will hit https://api.elections.kalshi.com/trade-api/v2/markets
 */
export async function fetchKalshiMarkets(
  _limit = 100,
): Promise<CanonicalMarket[]> {
  if (!process.env.KALSHI_API_KEY_ID) return [];
  // TODO: implement signed RSA request flow
  return [];
}

export async function fetchKalshiTrades(_opts: {
  limit?: number;
  minSizeUsd?: number;
}): Promise<TradeEvent[]> {
  if (!process.env.KALSHI_API_KEY_ID) return [];
  return [];
}
