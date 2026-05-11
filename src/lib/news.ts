import type { NewsItem } from "./exchanges/types";

/**
 * News provider — when NEWS_API_KEY is set, hits NewsAPI.org's
 * /everything endpoint for finance/politics/sports headlines and
 * tags them to active markets via keyword matching. When the key
 * is missing, falls back to seeded items so the UX is still testable.
 */

type SeededNews = Omit<NewsItem, "affectedMarketIds"> & {
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
      "Comments from two regional Fed presidents this morning reduced the implied probability of a near-term cut.",
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
    headline: "Arsenal star ruled out of weekend fixture with hamstring injury",
    url: "https://www.espn.com/soccer/",
    marketKeywords: ["arsenal"],
    priceImpact: -0.08,
  },
];

function minutesAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 1000);
}

// ============ NewsAPI.org integration ============

type NewsAPIArticle = {
  source?: { id?: string | null; name?: string | null };
  author?: string | null;
  title?: string | null;
  description?: string | null;
  url?: string | null;
  urlToImage?: string | null;
  publishedAt?: string | null;
  content?: string | null;
};

type NewsAPIResponse = {
  status: string;
  totalResults?: number;
  articles?: NewsAPIArticle[];
  message?: string;
};

/**
 * Hit NewsAPI's top-headlines endpoint for the broad categories Predix
 * cares about. Returns normalized + cached for 5min via Next.js fetch().
 */
async function fetchFromNewsAPI(): Promise<NewsItem[]> {
  const key = process.env.NEWS_API_KEY;
  if (!key) return [];

  // We pull a wide superset across business/politics/sports/tech and let the
  // keyword matcher do the routing to specific markets.
  const url = new URL("https://newsapi.org/v2/top-headlines");
  url.searchParams.set("language", "en");
  url.searchParams.set("country", "us");
  url.searchParams.set("pageSize", "60");

  try {
    const res = await fetch(url.toString(), {
      headers: { "X-Api-Key": key, accept: "application/json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      console.error("[news] NewsAPI returned", res.status);
      return [];
    }
    const json = (await res.json()) as NewsAPIResponse;
    if (json.status !== "ok" || !json.articles) {
      console.error("[news] NewsAPI bad response:", json.message);
      return [];
    }

    return json.articles
      .filter((a) => a.title && a.url && a.publishedAt)
      .map<NewsItem>((a) => ({
        id: a.url!,
        timestamp: new Date(a.publishedAt!),
        source: a.source?.name ?? "Unknown",
        headline: a.title!,
        url: a.url!,
        summary: a.description ?? undefined,
        affectedMarketIds: [], // populated by tagger below
      }));
  } catch (e) {
    console.error("[news] NewsAPI fetch failed:", e);
    return [];
  }
}

/**
 * Returns news items, with affectedMarketIds populated by matching against
 * each row's question text. Uses NewsAPI when configured, falls back to seeds.
 */
export async function getNewsForRows(
  rowIdsAndQuestions: Array<{ id: string; question: string }>,
): Promise<NewsItem[]> {
  const live = await fetchFromNewsAPI();

  let items: NewsItem[];
  if (live.length > 0) {
    items = live.map((n) => ({
      ...n,
      affectedMarketIds: tagMarkets(n.headline, n.summary, rowIdsAndQuestions),
    }));
  } else {
    // Fallback to seeds
    items = SEEDS.map((s) => ({
      id: s.id,
      timestamp: s.timestamp,
      source: s.source,
      headline: s.headline,
      url: s.url,
      summary: s.summary,
      affectedMarketIds: rowIdsAndQuestions
        .filter((r) =>
          s.marketKeywords.some((kw) => r.question.toLowerCase().includes(kw)),
        )
        .map((r) => r.id),
      priceImpact: s.priceImpact,
    }));
  }

  return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Cheap tagger: extract content words from headline+summary, link any
 * market whose question shares a meaningful word with the article.
 * This is a placeholder for proper NER + entity linking later.
 */
function tagMarkets(
  headline: string,
  summary: string | undefined,
  rows: Array<{ id: string; question: string }>,
): string[] {
  const text = `${headline} ${summary ?? ""}`.toLowerCase();
  const stopwords = new Set([
    "the","a","an","of","to","and","in","on","for","with","by","at","is",
    "as","that","this","be","are","was","were","it","from","or","but","not",
    "has","have","had","will","would","could","should","may","might","new",
    "after","before","during","while","says","said","report","reports","reported",
  ]);
  const words = new Set(
    text
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !stopwords.has(w)),
  );
  if (words.size === 0) return [];
  const matches: string[] = [];
  for (const r of rows) {
    const q = r.question.toLowerCase();
    let hits = 0;
    for (const w of words) {
      if (q.includes(w)) hits++;
      if (hits >= 2) break; // require at least 2 overlapping content words
    }
    if (hits >= 2) matches.push(r.id);
  }
  return matches;
}

/**
 * Sync helper retained for callers that haven't been migrated to async.
 * Returns seeded data only.
 */
export function getSeededNewsForRows(
  rowIdsAndQuestions: Array<{ id: string; question: string }>,
): NewsItem[] {
  return SEEDS.map((s) => ({
    id: s.id,
    timestamp: s.timestamp,
    source: s.source,
    headline: s.headline,
    url: s.url,
    summary: s.summary,
    affectedMarketIds: rowIdsAndQuestions
      .filter((r) =>
        s.marketKeywords.some((kw) => r.question.toLowerCase().includes(kw)),
      )
      .map((r) => r.id),
    priceImpact: s.priceImpact,
  })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
