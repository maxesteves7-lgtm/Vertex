/**
 * Google News RSS aggregation for the market detail "News Wire" panel.
 *
 * Google News exposes a public RSS endpoint for any search query — no API
 * key, no rate limit, no account. We build a query from the market question,
 * fetch it server-side, and parse the RSS items with a small regex-based
 * extractor (RSS is predictable enough that a full XML parser is overkill).
 *
 * File is kept at this path even though the panel is no longer AI-backed —
 * the OneDrive-synced sandbox can't reliably delete files, and renaming
 * routes would break existing URLs.
 */

const RSS_BASE = "https://news.google.com/rss/search";

export type WireItem = {
  title: string;
  url: string;
  source: string;
  publishedAt: string; // ISO
  snippet: string;
};

/** Build the Google News RSS URL for a search query. */
export function buildRssUrl(query: string): string {
  const url = new URL(RSS_BASE);
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "en-US");
  url.searchParams.set("gl", "US");
  url.searchParams.set("ceid", "US:en");
  return url.toString();
}

/**
 * Regex-based RSS 2.0 item extractor. Reliable enough for Google News's
 * well-formed output — swapping to `fast-xml-parser` would be overkill for
 * the ~10 items we consume per query.
 */
export function parseRssItems(xml: string, limit = 8): WireItem[] {
  const items: WireItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;
  while ((match = itemRe.exec(xml)) && items.length < limit) {
    const block = match[1];
    const title = decodeHtml(extractTag(block, "title"));
    const link = extractTag(block, "link").trim();
    const pubDate = extractTag(block, "pubDate").trim();
    const source = decodeHtml(extractTag(block, "source"));
    const descRaw = extractTag(block, "description");

    if (!title || !link) continue;

    // Description in Google News RSS is HTML with a list of source-linked
    // article snippets. Strip HTML and cap the length.
    const snippet = decodeHtml(stripHtml(descRaw)).slice(0, 220).trim();

    // Convert RFC 822 (e.g. "Mon, 09 Jun 2026 14:22:00 GMT") to ISO
    const publishedAt = pubDate
      ? new Date(pubDate).toISOString()
      : new Date().toISOString();

    items.push({
      title,
      url: link,
      source: source || "Google News",
      publishedAt,
      snippet,
    });
  }
  return items;
}

/** Pull the inner content of a single top-level RSS tag. Handles CDATA. */
function extractTag(block: string, tag: string): string {
  const re = new RegExp(
    `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
    "i",
  );
  const m = block.match(re);
  if (!m) return "";
  const inner = m[1].trim();
  // Handle <![CDATA[...]]>
  const cdata = inner.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
  return cdata ? cdata[1] : inner;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}
