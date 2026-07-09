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

  // 1. Fetch news headlines for grounding — best-effort. Next.js cache
  //    dedupes with /api/ai/overview so this is often instant.
  const query = normalizeQuery(body.question);
  let headlines: WireItem[] = [];
  try {
    const res = await fetch(buildRssUrl(query), {
      next: { revalidate: 600 },
      headers: {
        accept: "application/rss+xml, application/xml, text/xml, */*",
        "user-agent":
          "Mozilla/5.0 (compatible; FuturistTerminal/0.5; +https://predix-ochre.vercel.app)",
      },
    });
    if (res.ok) headlines = parseRssItems(await res.text(), 10);
  } catch {
    /* news failure is non-fatal — Gemini can still write from context */
  }

  // 2. Call Gemini
  const prompt = buildBriefPrompt(body, headlines);
  // Google has been quietly moving newer models (2.0-flash, 2.5-flash) out
  // of the free tier per-project. gemini-1.5-flash has the longest-standing
  // free-tier availability and is plenty capable for a market brief.
  const model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
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
          maxOutputTokens: 1200,
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

  const json = (await res.json()) as GeminiResponse;
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
  });
}

function normalizeQuery(q: string): string {
  return q
    .replace(/^\s*(will|is|does|do|has|have|are|can|should)\s+/i, "")
    .replace(/\?+\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}
