import { NextResponse } from "next/server";
import {
  buildRssUrl,
  parseRssItems,
  type WireItem,
} from "@/lib/aiOverview";
import {
  buildBriefPrompt,
  extractGeminiText,
  type AiBriefInput,
  type GeminiResponse,
} from "@/lib/aiBrief";
import { supabaseServer } from "@/lib/supabase/server";
import { getSubscription } from "@/lib/subscription";
import { bumpUsage } from "@/lib/usage";

const DAILY_LIMITS: Record<string, number> = {
  free: 0,
  pro: 20,
  institutional: Number.MAX_SAFE_INTEGER,
};

/**
 * POST /api/ai/brief
 * Body: AiBriefInput
 *
 * Free trader briefing:
 *  1. Fetches recent Google News headlines about the event (no API key)
 *  2. Passes them + market data into Gemini 2.0 Flash (Google's free tier)
 *  3. Returns the synthesized brief
 *
 * When GEMINI_API_KEY isn't set the response is {configured:false} so the UI
 * shows a setup hint instead of erroring. Non-fatal news-fetch failures are
 * tolerated — Gemini can still synthesize using its training-data knowledge.
 */
export const maxDuration = 30;

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { configured: false, content: "", generatedAt: null },
      { status: 200 },
    );
  }

  let body: AiBriefInput;
  try {
    body = (await req.json()) as AiBriefInput;
  } catch {
    return NextResponse.json(
      { error: "invalid JSON body" },
      { status: 400 },
    );
  }
  if (!body?.question || !body?.category) {
    return NextResponse.json(
      { error: "question and category are required" },
      { status: 400 },
    );
  }

  // Auth + tier check + daily-cap enforcement. Free users are blocked by
  // the UI, but double-check here so a curl request can't sneak through.
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) {
    return NextResponse.json(
      { error: "Sign in to use AI Overview." },
      { status: 401 },
    );
  }
  const subInfo = await getSubscription(user.email);
  const limit = DAILY_LIMITS[subInfo.tier] ?? 0;
  if (limit === 0) {
    return NextResponse.json(
      {
        error:
          "AI Overview requires a Pro or Institutional plan. See /pricing.",
        upgradeUrl: "/pricing",
      },
      { status: 402 }, // Payment Required
    );
  }
  const usage = await bumpUsage(user.email, "ai_overview", limit);
  if (!usage.allowed) {
    return NextResponse.json(
      {
        error: `Daily AI Overview limit reached (${usage.used}/${usage.limit}). Upgrade to Institutional for unlimited.`,
        used: usage.used,
        limit: usage.limit,
        remaining: 0,
      },
      { status: 429 }, // Too Many Requests
    );
  }

  // 1. Fetch news for grounding — two queries per market to get more signal:
  //    the full question and a keyword-only variant that catches broader
  //    context. Best-effort; if news fails, Gemini falls back to knowledge.
  const query = normalizeQuery(body.question);
  const keywordsQuery = extractKeywords(body.question);
  const headlines = await fetchHeadlinesForQueries(
    keywordsQuery && keywordsQuery !== query ? [query, keywordsQuery] : [query],
  );

  // 2. Call Gemini
  const prompt = buildBriefPrompt(body, headlines);
  // Google keeps deprecating pinned model names — 1.5-flash gone from
  // v1beta, 2.5-flash "no longer available to new users", 2.0-flash off the
  // free tier. `gemini-flash-latest` is their evergreen alias that always
  // points to the current available flash model. Override via env var
  // (GEMINI_MODEL) to pin a specific version.
  const model = process.env.GEMINI_MODEL ?? "gemini-flash-latest";
  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
  );
  url.searchParams.set("key", apiKey);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2000,
        },
        // Loosen the default safety a bit — market briefs about politics or
        // war-adjacent events get blocked by the default thresholds.
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_ONLY_HIGH",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_ONLY_HIGH",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_ONLY_HIGH",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_ONLY_HIGH",
          },
        ],
      }),
    });
  } catch (e) {
    return NextResponse.json(
      {
        configured: true,
        content: "",
        error: e instanceof Error ? e.message : "Gemini network error",
      },
      { status: 502 },
    );
  }

  // Read as text first so a non-JSON error page (Google occasionally serves
  // HTML on rate limits / regional blocks) surfaces as a real message
  // instead of crashing with "unexpected token 'A'".
  const rawText = await res.text();
  let json: GeminiResponse = {};
  try {
    json = JSON.parse(rawText) as GeminiResponse;
  } catch {
    return NextResponse.json(
      {
        configured: true,
        content: "",
        error: `Gemini returned non-JSON (${res.status}): ${rawText.slice(0, 200)}`,
      },
      { status: 502 },
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      {
        configured: true,
        content: "",
        error: json.error?.message ?? `Gemini ${res.status}`,
      },
      { status: 502 },
    );
  }

  const content = extractGeminiText(json);
  if (!content) {
    return NextResponse.json(
      {
        configured: true,
        content: "",
        error:
          json.promptFeedback?.blockReason
            ? `Blocked by Gemini safety filter (${json.promptFeedback.blockReason}).`
            : "Gemini returned no content.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    configured: true,
    content,
    generatedAt: new Date().toISOString(),
    headlinesUsed: headlines.length,
    used: usage.used,
    limit: usage.limit === Number.MAX_SAFE_INTEGER ? null : usage.limit,
    remaining:
      usage.limit === Number.MAX_SAFE_INTEGER ? null : usage.remaining,
  });
}

function normalizeQuery(q: string): string {
  return q
    .replace(/^\s*(will|is|does|do|has|have|are|can|should)\s+/i, "")
    .replace(/\?+\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract 3–6 high-signal search keywords from a market question — proper
 * nouns, numbers, and years. Used as a second RSS query alongside the full
 * normalized question so we get broader context on niche markets.
 */
function extractKeywords(question: string): string {
  const stop = new Set([
    "the",
    "and",
    "for",
    "with",
    "will",
    "that",
    "this",
    "from",
    "have",
    "has",
    "had",
    "are",
    "is",
    "was",
    "were",
    "be",
    "been",
    "being",
    "or",
    "in",
    "on",
    "at",
    "to",
    "of",
    "a",
    "an",
    "by",
    "as",
    "vs",
    "team",
  ]);
  const tokens = question.replace(/[?.,!]/g, "").split(/\s+/);
  const kept = tokens.filter((t) => {
    const lower = t.toLowerCase();
    if (stop.has(lower)) return false;
    if (t.length < 2) return false;
    // keep numbers, or words that start with a capital, or 4+-char lowercase
    if (/^\d/.test(t)) return true;
    if (/^[A-Z]/.test(t)) return true;
    return t.length >= 5;
  });
  return kept.slice(0, 6).join(" ").trim();
}

/**
 * Fetch multiple Google News RSS queries in parallel and merge results,
 * deduping by URL. Order preserves the first query's ranking.
 */
async function fetchHeadlinesForQueries(
  queries: string[],
): Promise<WireItem[]> {
  const seen = new Set<string>();
  const out: WireItem[] = [];
  const results = await Promise.all(
    queries.map(async (q) => {
      try {
        const res = await fetch(buildRssUrl(q), {
          next: { revalidate: 600 },
          headers: {
            accept: "application/rss+xml, application/xml, text/xml, */*",
            "user-agent":
              "Mozilla/5.0 (compatible; FuturistTerminal/0.5; +https://predix-ochre.vercel.app)",
          },
        });
        if (!res.ok) return [] as WireItem[];
        return parseRssItems(await res.text(), 10);
      } catch {
        return [] as WireItem[];
      }
    }),
  );
  for (const list of results) {
    for (const item of list) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      out.push(item);
    }
  }
  return out.slice(0, 15);
}
