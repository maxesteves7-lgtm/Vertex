/**
 * Cross-exchange market matching.
 *
 * Polymarket and Kalshi phrase the same market differently:
 *   "Will Bitcoin hit $150k by June 30, 2026?"
 *   "Bitcoin price ≥ $150,000 on Jun 30, 2026"
 *
 * Strategy: extract a signature (set of significant tokens) per question,
 * then pair markets whose signatures share enough tokens — with hard
 * filters on dates and dollar amounts so e.g. "Bitcoin $150k 2026" and
 * "Bitcoin $200k 2026" don't get paired.
 */

const STOPWORDS = new Set([
  "will", "the", "be", "of", "in", "on", "at", "to", "for", "and", "or", "by",
  "a", "an", "is", "are", "was", "were", "with", "from", "this", "that",
  "these", "those", "have", "has", "had", "do", "does", "did", "as", "it",
  "its", "than", "then", "but", "if", "any", "all", "more", "less", "above",
  "below", "before", "after", "during", "between", "next", "previous", "last",
  "first", "current", "new", "old", "open", "close", "say", "says",
  "happen", "happens", "make", "makes", "ever", "yes", "no",
]);

const MONTHS: Record<string, string> = {
  jan: "jan", january: "jan",
  feb: "feb", february: "feb",
  mar: "mar", march: "mar",
  apr: "apr", april: "apr",
  may: "may",
  jun: "jun", june: "jun",
  jul: "jul", july: "jul",
  aug: "aug", august: "aug",
  sep: "sep", sept: "sep", september: "sep",
  oct: "oct", october: "oct",
  nov: "nov", november: "nov",
  dec: "dec", december: "dec",
};

export type Signature = {
  /** Significant content words (w:bitcoin, w:eurovision, etc.) */
  words: Set<string>;
  /** Year tokens (y:2026). If both sigs have year tokens, they must intersect. */
  years: Set<string>;
  /** Numeric magnitudes — dollar amounts, k/m/b suffixes normalized. */
  numbers: Set<number>;
  /** Month tokens (m:jun). Soft signal, not hard required. */
  months: Set<string>;
};

/**
 * Build a signature from a market question.
 */
export function buildSignature(question: string): Signature {
  const lower = question.toLowerCase();
  const words = new Set<string>();
  const years = new Set<string>();
  const numbers = new Set<number>();
  const months = new Set<string>();

  // Years (any 4-digit 19xx or 20xx number)
  for (const m of lower.matchAll(/\b(19|20)\d{2}\b/g)) {
    years.add(m[0]);
  }

  // Months (long or short)
  for (const m of lower.matchAll(
    /\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\b/g,
  )) {
    const norm = MONTHS[m[1]];
    if (norm) months.add(norm);
  }

  // Dollar / large-number magnitudes. Catches "150k", "$150,000", "1.5m"
  for (const m of lower.matchAll(
    /\$?(\d+(?:,\d{3})*(?:\.\d+)?)(\s?[kmb])?/g,
  )) {
    const raw = m[1].replace(/,/g, "");
    let n = parseFloat(raw);
    if (!Number.isFinite(n)) continue;
    const suffix = (m[2] ?? "").trim().toLowerCase();
    if (suffix === "k") n *= 1_000;
    else if (suffix === "m") n *= 1_000_000;
    else if (suffix === "b") n *= 1_000_000_000;
    // Ignore tiny numbers (likely day-of-month or counts) and years
    if (n >= 100 && (n < 1900 || n > 2100)) {
      numbers.add(Math.round(n));
    }
  }

  // Content words: length >= 4, non-stopword, not pure digits
  for (const w of lower.replace(/[^a-z\s]/g, " ").split(/\s+/)) {
    if (w.length < 4) continue;
    if (STOPWORDS.has(w)) continue;
    if (MONTHS[w]) continue; // already captured
    words.add(w);
  }

  return { words, years, numbers, months };
}

/**
 * Score similarity between two signatures, 0..1.
 * Returns 0 if the sigs are mutually incompatible (different years, different
 * dollar amounts).
 */
export function similarity(a: Signature, b: Signature): number {
  // Hard reject: if both have years and they don't intersect.
  if (a.years.size > 0 && b.years.size > 0) {
    let yearMatch = false;
    for (const y of a.years) {
      if (b.years.has(y)) { yearMatch = true; break; }
    }
    if (!yearMatch) return 0;
  }

  // Hard reject: if both have number magnitudes and none match (with 10% tolerance).
  if (a.numbers.size > 0 && b.numbers.size > 0) {
    let numMatch = false;
    for (const na of a.numbers) {
      for (const nb of b.numbers) {
        const tol = Math.max(na, nb) * 0.1;
        if (Math.abs(na - nb) <= tol) {
          numMatch = true;
          break;
        }
      }
      if (numMatch) break;
    }
    if (!numMatch) return 0;
  }

  // Combine all tokens into one set for Jaccard
  const aTokens = setOf(a);
  const bTokens = setOf(b);
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let inter = 0;
  for (const t of aTokens) if (bTokens.has(t)) inter++;
  const union = aTokens.size + bTokens.size - inter;
  if (union === 0) return 0;
  return inter / union;
}

function setOf(sig: Signature): Set<string> {
  const s = new Set<string>();
  for (const w of sig.words) s.add(`w:${w}`);
  for (const y of sig.years) s.add(`y:${y}`);
  for (const n of sig.numbers) s.add(`n:${n}`);
  for (const m of sig.months) s.add(`m:${m}`);
  return s;
}

/**
 * Greedily pair items in `a` to items in `b` based on similarity. Each
 * item can be used at most once. Returns the index pairs that crossed
 * the threshold, plus the unmatched indices on each side.
 */
export function greedyPair<T>(
  a: T[],
  b: T[],
  sigOf: (item: T) => Signature,
  threshold = 0.4,
): {
  pairs: Array<{ aIdx: number; bIdx: number; score: number }>;
  unmatchedA: number[];
  unmatchedB: number[];
} {
  const aSigs = a.map(sigOf);
  const bSigs = b.map(sigOf);

  // Build all candidate pairs that pass the threshold, sort by score desc.
  type Cand = { aIdx: number; bIdx: number; score: number };
  const cands: Cand[] = [];
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      const s = similarity(aSigs[i], bSigs[j]);
      if (s >= threshold) cands.push({ aIdx: i, bIdx: j, score: s });
    }
  }
  cands.sort((x, y) => y.score - x.score);

  const usedA = new Set<number>();
  const usedB = new Set<number>();
  const pairs: Cand[] = [];
  for (const c of cands) {
    if (usedA.has(c.aIdx) || usedB.has(c.bIdx)) continue;
    pairs.push(c);
    usedA.add(c.aIdx);
    usedB.add(c.bIdx);
  }

  const unmatchedA: number[] = [];
  for (let i = 0; i < a.length; i++) if (!usedA.has(i)) unmatchedA.push(i);
  const unmatchedB: number[] = [];
  for (let j = 0; j < b.length; j++) if (!usedB.has(j)) unmatchedB.push(j);

  return { pairs, unmatchedA, unmatchedB };
}
