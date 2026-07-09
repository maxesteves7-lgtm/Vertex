import { NextResponse } from "next/server";
import { buildRssUrl, parseRssItems, type WireItem } from "@/lib/aiOverview";

/**
 * POST /api/ai/overview
 * Body: { question: string, category?: string }
 *
 * Returns `{ items: WireItem[], generatedAt: ISO }`. Powered by Google
 * News RSS — no API key, no rate limit, no billing. The route path is
 * kept ("/ai/overview") for backwards compat with the deployed clients;
 * the content is now a free "News Wire" rather than an Anthropic call.
 */
export async function POST(req: Request) {
  let body: { question?: unknown; category?: unknown };
  try {
    body = (await req.json()) as { question?: unknown; category?: unknown };
  } catch {
    return NextResponse.json(
      { error: "invalid JSON body" },
      { status: 400 },
    );
  }
  const question =
    typeof body?.question === "string" ? body.question.trim() : "";
  if (!question) {
    return NextResponse.json(
      { error: "question is required" },
      { status: 400 },
    );
  }

  // A better query than the raw market title — strip leading "Will "
  // and trailing "?" so we search the topic rather than the phrasing.
  const query = normalizeQuery(question);

  let items: WireItem[] = [];
  let error: string | null = null;
  try {
    const res = await fetch(buildRssUrl(query), {
      // Cache the same query at the edge for 10 min — Google News moves
      // fast enough that anything longer starts feeling stale
      next: { revalidate: 600 },
      headers: {
        accept: "application/rss+xml, application/xml, text/xml, */*",
        "user-agent":
          "Mozilla/5.0 (compatible; FuturistTerminal/0.5; +https://predix-ochre.vercel.app)",
      },
    });
    if (!res.ok) {
      error = `Google News returned ${res.status}`;
    } else {
      const xml = await res.text();
      items = parseRssItems(xml, 10);
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "news fetch failed";
  }

  return NextResponse.json(
    {
      items,
      query,
      generatedAt: new Date().toISOString(),
      error,
    },
    {
      headers: {
        // Give browsers/edges another 10 min so re-opens are instant
        "cache-control": "public, s-maxage=600, stale-while-revalidate=1800",
      },
    },
  );
}

/**
 * Normalize a market question into a decent search query. Strips leading
 * "Will "/"Is " and trailing "?"; collapses whitespace.
 */
function normalizeQuery(q: string): string {
  return q
    .replace(/^\s*(will|is|does|do|has|have|are|can|should)\s+/i, "")
    .replace(/\?+\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}
