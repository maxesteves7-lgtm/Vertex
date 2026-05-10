import type { NewsItem } from "./exchanges/types";

/**
 * News provider — currently returns a curated set of seeded items so the
 * UX is testable. Replace with a real source (NewsAPI.org, RSS, etc.) by
 * setting NEWS_API_KEY in env and implementing the real fetch path.
 *
 * The seeded items are deliberately tagged with keyword fragments rather
 * than market IDs so they can be soft-linked to whatever real markets
 * the screener returns at runtime.
 */
type SeededNews = Omit<NewsItem, "affectedMarketIds"> & {
  /** Lowercase keyword phrases — any market whose question contains these gets linked */
  marketKeywords: string[];
};

const SEEDS: SeededNews[] = [
  {
    id: "seed-fed-rate-hold",
    timestamp: minutesAgo(45),
    source: "Reuters",
    headline:
      "Fed signals patience on rate cuts as core inflation ticks up to 3.1%",
    url: "https://www.reuters.com/markets/us/",
    summary:
      "Comments from two regional Fed presidents this morning reduced the implied probability of a near-term cut, with traders now pricing the next move in Q3.",
    marketKeywords: ["fed", "rate", "interest", "inflation"],
    priceImpact: -0.04,
  },
  {
    id: "seed-trump-poll",
    timestamp: minutesAgo(120),
    source: "AP",
    headline:
      "National poll shows Trump approval slipping 3 points after tariff announcement",
    url: "https://apnews.com/",
    marketKeywords: ["trump", "approval", "president"],
    priceImpact: -0.03,
  },
  {
    id: "seed-btc-etf-flow",
    timestamp: minutesAgo(15),
    source: "CoinDesk",
    headline:
      "Spot Bitcoin ETFs see $480M of net inflows on the day, biggest since March",
    url: "https://www.coindesk.com/",
    marketKeywords: ["bitcoin", "btc", "crypto"],
    priceImpact: 0.025,
  },
  {
    id: "seed-openai-rumor",
    timestamp: minutesAgo(8),
    source: "The Information",
    headline:
      "OpenAI in early talks with bankers for tender offer at $500B valuation",
    url: "https://www.theinformation.com/",
    marketKeywords: ["openai", "ipo", "valuation"],
    priceImpact: 0.06,
  },
  {
    id: "seed-arsenal-injury",
    timestamp: minutesAgo(180),
    source: "ESPN",
    headline:
      "Arsenal star ruled out of weekend fixture with hamstring injury",
    url: "https://www.espn.com/soccer/",
    marketKeywords: ["arsenal"],
    priceImpact: -0.08,
  },
  {
    id: "seed-eth-upgrade",
    timestamp: minutesAgo(240),
    source: "Bloomberg",
    headline:
      "Ethereum core devs delay Pectra activation by two weeks citing testnet issues",
    url: "https://www.bloomberg.com/crypto",
    marketKeywords: ["ethereum", "eth"],
    priceImpact: -0.015,
  },
  {
    id: "seed-china-taiwan",
    timestamp: minutesAgo(30),
    source: "FT",
    headline:
      "Beijing announces 4-day naval exercises encircling Taiwan starting next week",
    url: "https://www.ft.com/",
    marketKeywords: ["china", "taiwan", "invade"],
    priceImpact: 0.02,
  },
  {
    id: "seed-jobs-report",
    timestamp: minutesAgo(60),
    source: "WSJ",
    headline:
      "May payrolls beat estimates: +185k jobs, unemployment unchanged at 4.1%",
    url: "https://www.wsj.com/",
    marketKeywords: ["jobs", "unemployment", "payroll", "recession"],
    priceImpact: -0.018,
  },
];

function minutesAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 1000);
}

/**
 * Returns news items, with affectedMarketIds populated by matching market
 * IDs whose questions contain any of the seeded keyword phrases.
 */
export function getNewsForRows(
  rowIdsAndQuestions: Array<{ id: string; question: string }>,
): NewsItem[] {
  return SEEDS.map((s) => {
    const affected: string[] = [];
    for (const r of rowIdsAndQuestions) {
      const q = r.question.toLowerCase();
      if (s.marketKeywords.some((kw) => q.includes(kw))) affected.push(r.id);
    }
    return {
      id: s.id,
      timestamp: s.timestamp,
      source: s.source,
      headline: s.headline,
      url: s.url,
      summary: s.summary,
      affectedMarketIds: affected,
      priceImpact: s.priceImpact,
    };
  }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Filter helper used by the detail panel — returns news items affecting
 * a specific market.
 */
export function filterNewsForMarket(
  items: NewsItem[],
  marketId: string,
): NewsItem[] {
  return items.filter((n) => n.affectedMarketIds.includes(marketId));
}
