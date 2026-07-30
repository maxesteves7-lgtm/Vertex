/**
 * AI Brief prompt template + Gemini response shape.
 *
 * We use Google's Gemini 2.0 Flash free tier (1,500 requests/day, no billing
 * required) to synthesize a trader-focused overview. Gemini's built-in
 * grounding-with-Google-Search is a paid feature — instead we ground the
 * model ourselves by passing recent Google News RSS headlines (fetched
 * separately, also free) into the prompt as context. So the whole panel
 * stays free while still being current.
 */

import type { WireItem } from "./aiOverview";

export type AiBriefInput = {
  question: string;
  category: string;
  source: string; // "Polymarket" | "Kalshi" | "Both"
  yesPrice: number | null;
  noPrice: number | null;
  volume24h: number | null;
  closesAt: string | null; // ISO
  priceChange24h: number | null; // signed decimal
};

const CATEGORY_LEAD: Record<string, string> = {
  Politics:
    "Lead with polling momentum, recent statements or actions by the principals, and legal developments. Cite the specific poll or headline.",
  Macro:
    "Lead with the macro data print schedule (CPI, PCE, NFP, FOMC) and how the current market pricing compares to consensus. Name the specific data or Fed speaker.",
  Crypto:
    "Lead with recent spot action, ETF flows, on-chain metrics, and regulatory catalysts. Name specific dates.",
  "AI/Tech":
    "Lead with product timelines, benchmark results, launch schedules, and any regulatory news. Cite the source.",
  Sports:
    "Lead with injuries, suspensions, roster changes, recent form, and head-to-head history. Cite the source.",
  Culture:
    "Lead with recent announcements, insider reporting, and industry buzz. Name the source (Deadline, Variety, THR, Puck).",
  Health:
    "Lead with trial timelines, FDA milestones, expert consensus, and prior-cycle precedent.",
  Weather:
    "Lead with model consensus, NWS/NHC advisories, and historical baselines.",
};

export function buildBriefPrompt(
  input: AiBriefInput,
  headlines: WireItem[],
): string {
  const lead =
    CATEGORY_LEAD[input.category] ??
    "Lead with whatever recent developments most directly move this market.";

  const yes =
    input.yesPrice !== null ? `${(input.yesPrice * 100).toFixed(1)}%` : "n/a";
  const no =
    input.noPrice !== null ? `${(input.noPrice * 100).toFixed(1)}%` : "n/a";
  const vol =
    input.volume24h !== null && Number.isFinite(input.volume24h)
      ? `$${Math.round(input.volume24h).toLocaleString("en-US")}`
      : "n/a";
  const delta =
    input.priceChange24h !== null && Number.isFinite(input.priceChange24h)
      ? `${input.priceChange24h >= 0 ? "+" : ""}${(input.priceChange24h * 100).toFixed(1)}pp`
      : "n/a";
  const closes = input.closesAt
    ? new Date(input.closesAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "n/a";

  const headlineBlock =
    headlines.length === 0
      ? "(No recent headlines pulled — lean on your own knowledge of the entities and context involved.)"
      : headlines
          .slice(0, 15)
          .map(
            (h, i) =>
              `${i + 1}. [${h.source}, ${new Date(h.publishedAt).toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric" },
              )}] ${h.title}\n   ${h.snippet}`,
          )
          .join("\n");

  return `You are a senior analyst writing a briefing for a hedge fund trader who is about to size a position on a prediction market. Your job is to deliver actionable intelligence, not a summary of the market question. The trader already knows what the market is asking — they need context, analysis, and a view.

EVENT
  Question: ${input.question}
  Platform: ${input.source} (${input.category})
  Current pricing: YES ${yes} | NO ${no}
  24h price change: ${delta} | 24h volume: ${vol}
  Resolves: ${closes}

RECENT HEADLINES (via Google News search)
${headlineBlock}

CATEGORY-SPECIFIC ANGLE
${lead}

Write a briefing with the following exact structure. Use markdown-style **bold** section headers and bullet points. No preamble, no restating the question:

**Recent catalysts**
- 2–3 bullets on the developments most directly moving this market. Blend the headlines above with your own knowledge of the entities and context. Cite specific names, dates, and numbers.

**Upcoming to watch**
- 2–3 bullets on hard catalysts between now and resolution: specific dates, releases, games, elections, hearings, decisions. Be as specific as possible.

**Pricing reality check**
- 2 bullets comparing YES ${yes} to your assessment of the true probability. Argue whether the market is rich, cheap, or fair — and by roughly how much. Reference base rates, historical patterns, or comparable events.

**Biggest risk**
- 1 bullet naming the single most likely event that would cause a sharp move, and which side (YES or NO) it would push.

Rules:
- Blend the fresh headlines with your own knowledge of the topic. Do not refuse to write a section just because headlines are sparse — use what you know, and if you're inferring rather than citing news, say so briefly ("based on general knowledge of X, ...").
- Be direct and specific. No generic hedges. Every bullet should tell the trader something they couldn't see just by looking at the price.
- Never invent citations. Cite headlines only when you're actually using them.
- Never restate the market question. Get straight to the analysis.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini response shapes (just enough to extract text)
// ─────────────────────────────────────────────────────────────────────────────

type GeminiCandidate = {
  content?: { parts?: Array<{ text?: string }> };
  finishReason?: string;
};

export type GeminiResponse = {
  candidates?: GeminiCandidate[];
  error?: { message?: string; code?: number };
  promptFeedback?: { blockReason?: string };
};

/** Extract concatenated text from Gemini's `candidates[0].content.parts[]`. */
export function extractGeminiText(res: GeminiResponse): string {
  const parts = res.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((p) => p.text ?? "")
    .join("")
    .trim();
}
