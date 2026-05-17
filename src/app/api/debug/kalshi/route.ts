import { NextResponse } from "next/server";

/**
 * Deep diagnostic — pulls raw Kalshi markets, breaks down strike_type
 * counts, and shows samples that would survive each filter stage.
 * Visit /api/debug/kalshi.
 */
export async function GET() {
  const url =
    "https://api.elections.kalshi.com/trade-api/v2/markets?status=open&limit=100";

  type Raw = {
    ticker?: string;
    title?: string;
    strike_type?: string;
    market_type?: string;
    status?: string;
    mve_selected_legs?: unknown[];
    yes_bid_dollars?: string;
    yes_ask_dollars?: string;
    no_bid_dollars?: string;
    last_price_dollars?: string;
    volume_24h_fp?: string;
    liquidity_dollars?: string;
    [k: string]: unknown;
  };

  let raw: Raw[] = [];
  let fetchStatus: number | string = "n/a";
  try {
    const r = await fetch(url, { cache: "no-store" });
    fetchStatus = r.status;
    const j = (await r.json()) as { markets?: Raw[] };
    raw = j.markets ?? [];
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e), fetchStatus },
      { status: 500 },
    );
  }

  // Bucket by strike_type
  const strikeTypeCounts: Record<string, number> = {};
  for (const m of raw) {
    const k = m.strike_type ?? "(none)";
    strikeTypeCounts[k] = (strikeTypeCounts[k] ?? 0) + 1;
  }

  // Markets with a real yes_ask_dollars > 0
  const withQuote = raw.filter((m) => {
    const ask = parseFloat(m.yes_ask_dollars ?? "");
    return Number.isFinite(ask) && ask > 0;
  });

  // Markets that aren't multivariate combos
  const notCombo = raw.filter(
    (m) =>
      (!m.mve_selected_legs || m.mve_selected_legs.length === 0) &&
      m.strike_type !== "custom",
  );

  // Markets that survive BOTH filters
  const surviving = raw.filter((m) => {
    const ask = parseFloat(m.yes_ask_dollars ?? "");
    const notMv =
      (!m.mve_selected_legs || m.mve_selected_legs.length === 0) &&
      m.strike_type !== "custom";
    return notMv && Number.isFinite(ask) && ask > 0;
  });

  return NextResponse.json({
    fetchStatus,
    rawCount: raw.length,
    strikeTypeCounts,
    notComboCount: notCombo.length,
    withQuoteCount: withQuote.length,
    survivingBothCount: surviving.length,
    // Sample 5 surviving — what would actually reach the screener
    survivingSamples: surviving.slice(0, 5).map((m) => ({
      ticker: m.ticker,
      title: m.title,
      strike_type: m.strike_type,
      status: m.status,
      yes_bid_dollars: m.yes_bid_dollars,
      yes_ask_dollars: m.yes_ask_dollars,
      last_price_dollars: m.last_price_dollars,
      volume_24h_fp: m.volume_24h_fp,
    })),
    // Sample 3 raw — see what Kalshi is returning at all
    rawSamples: raw.slice(0, 3).map((m) => ({
      ticker: m.ticker,
      title: m.title,
      strike_type: m.strike_type,
      mve_legs: m.mve_selected_legs?.length ?? 0,
      yes_ask_dollars: m.yes_ask_dollars,
    })),
  });
}
