/**
 * Advanced filter state + evaluator for the market scanner.
 *
 * This is layered on top of the existing sidebar selection (view /
 * category / custom screener) and the existing chips (source / sort).
 * A user's active FiltersState acts as an additional narrowing pass over
 * the already-filtered row set — it does not replace those controls.
 *
 * Design notes:
 *   - Every field is optional; the empty object means "no filters".
 *   - The evaluator is pure — takes rows in, returns rows out. No React.
 *   - Preset screeners are just named FiltersState objects.
 */

import type { ScreenerRow } from "./exchanges/types";

export type FilterSource = "Polymarket" | "Kalshi" | "Both";

export type FiltersState = {
  /** YES probability range 0..1 (inclusive) */
  yesMin?: number;
  yesMax?: number;
  /** Absolute 24h price change floor (0..1, e.g. 0.05 = ≥5pp) */
  priceChangeAbs?: number;
  /** Direction filter on the 24h change */
  priceChangeDir?: "up" | "down" | "any";
  /** Minimum 24h volume in USD */
  minVolume24h?: number;
  /** Minimum liquidity in USD */
  minLiquidity?: number;
  /** Only markets closing within this many days from now */
  closingWithinDays?: number;
  /** Skip markets closing in the next 24h (for traders who need reaction time) */
  excludeClosingWithin24h?: boolean;
  /** Source multi-select — empty/undefined = any source */
  sources?: FilterSource[];
  /** Category buckets to INCLUDE — empty/undefined = any bucket */
  categories?: string[];
  /** Category buckets to EXCLUDE (applied after includes) */
  excludeCategories?: string[];
  /** Multi-outcome markets: Polymarket sends `siblings` array on those */
  structure?: "binary" | "multi" | "any";
};

export const emptyFilters: FiltersState = {};

// ─────────────────────────────────────────────────────────────────────────────
// Evaluator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apply a FiltersState to a row set. Returns the subset that passes every
 * active filter. Ignores undefined fields, so an empty state is a no-op.
 */
export function applyFilters(
  rows: ScreenerRow[],
  f: FiltersState,
): ScreenerRow[] {
  if (isEmpty(f)) return rows;
  const now = Date.now();
  const closingCutoffMs =
    f.closingWithinDays !== undefined
      ? now + f.closingWithinDays * 24 * 3600 * 1000
      : null;
  const excludeCutoffMs = f.excludeClosingWithin24h
    ? now + 24 * 3600 * 1000
    : null;

  return rows.filter((r) => {
    // Yes-price range — falls back to whichever exchange has a price
    const yes = pickYes(r);
    if (f.yesMin !== undefined && (yes === null || yes < f.yesMin)) return false;
    if (f.yesMax !== undefined && (yes === null || yes > f.yesMax)) return false;

    // 24h price change
    const chg = pickChange(r);
    if (f.priceChangeAbs !== undefined) {
      if (chg === null || Math.abs(chg) < f.priceChangeAbs) return false;
      if (f.priceChangeDir === "up" && chg < 0) return false;
      if (f.priceChangeDir === "down" && chg > 0) return false;
    }

    // Volume + liquidity
    if (f.minVolume24h !== undefined && (r.volume24h ?? 0) < f.minVolume24h)
      return false;
    if (f.minLiquidity !== undefined && (r.liquidity ?? 0) < f.minLiquidity)
      return false;

    // Time filters
    if (closingCutoffMs !== null) {
      if (!r.closesAt || r.closesAt.getTime() > closingCutoffMs) return false;
    }
    if (excludeCutoffMs !== null && r.closesAt && r.closesAt.getTime() <= excludeCutoffMs) {
      return false;
    }

    // Source (Polymarket / Kalshi / Both listing)
    if (f.sources && f.sources.length > 0) {
      const source = deriveSource(r);
      if (!f.sources.includes(source)) return false;
    }

    // Category include / exclude
    if (f.categories && f.categories.length > 0) {
      if (!f.categories.includes(r.bucket)) return false;
    }
    if (f.excludeCategories && f.excludeCategories.length > 0) {
      if (f.excludeCategories.includes(r.bucket)) return false;
    }

    // Structure — binary vs multi-outcome
    if (f.structure && f.structure !== "any") {
      const hasSiblings =
        (r.polymarket?.siblings?.length ?? 0) > 0 ||
        (r.kalshi?.siblings?.length ?? 0) > 0;
      if (f.structure === "binary" && hasSiblings) return false;
      if (f.structure === "multi" && !hasSiblings) return false;
    }

    return true;
  });
}

function pickYes(r: ScreenerRow): number | null {
  return r.polymarket?.yesPrice ?? r.kalshi?.yesPrice ?? null;
}
function pickChange(r: ScreenerRow): number | null {
  return (
    r.polymarket?.priceChange24h ?? r.kalshi?.priceChange24h ?? null
  );
}
function deriveSource(r: ScreenerRow): FilterSource {
  const hasPoly = typeof r.polymarket?.yesPrice === "number";
  const hasKalshi = typeof r.kalshi?.yesPrice === "number";
  if (hasPoly && hasKalshi) return "Both";
  if (hasPoly) return "Polymarket";
  return "Kalshi";
}

// ─────────────────────────────────────────────────────────────────────────────
// State helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Number of active filter fields — used for the button badge. */
export function countActive(f: FiltersState): number {
  let n = 0;
  if (f.yesMin !== undefined) n++;
  if (f.yesMax !== undefined) n++;
  if (f.priceChangeAbs !== undefined) n++;
  if (f.priceChangeDir && f.priceChangeDir !== "any") n++;
  if (f.minVolume24h !== undefined) n++;
  if (f.minLiquidity !== undefined) n++;
  if (f.closingWithinDays !== undefined) n++;
  if (f.excludeClosingWithin24h) n++;
  if (f.sources && f.sources.length > 0) n++;
  if (f.categories && f.categories.length > 0) n++;
  if (f.excludeCategories && f.excludeCategories.length > 0) n++;
  if (f.structure && f.structure !== "any") n++;
  return n;
}

export function isEmpty(f: FiltersState): boolean {
  return countActive(f) === 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Presets — one-click screeners built on the same FiltersState schema
// ─────────────────────────────────────────────────────────────────────────────

export type Preset = {
  id: string;
  label: string;
  description: string;
  filters: FiltersState;
};

export const PRESETS: Preset[] = [
  {
    id: "mispriced-favorites",
    label: "Mispriced Favorites",
    description: "YES ≥ 85% with a ≥5pp move in the last 24h and vol ≥ $10K",
    filters: {
      yesMin: 0.85,
      priceChangeAbs: 0.05,
      minVolume24h: 10_000,
    },
  },
  {
    id: "high-conviction-longshots",
    label: "High-Conviction Longshots",
    description: "YES ≤ 15%, vol ≥ $5K, closes >7 days out",
    filters: {
      yesMax: 0.15,
      minVolume24h: 5_000,
      excludeClosingWithin24h: true,
    },
  },
  {
    id: "toss-ups",
    label: "Toss-Ups",
    description: "YES between 40-60%, vol ≥ $10K, closes in ≤30 days",
    filters: {
      yesMin: 0.4,
      yesMax: 0.6,
      minVolume24h: 10_000,
      closingWithinDays: 30,
    },
  },
  {
    id: "about-to-resolve",
    label: "About to Resolve",
    description: "Closing within 48h, any price, sort by volume",
    filters: {
      closingWithinDays: 2,
    },
  },
  {
    id: "big-movers",
    label: "Big Movers Today",
    description: "|Δ24h| ≥ 10pp, either direction",
    filters: {
      priceChangeAbs: 0.1,
      priceChangeDir: "any",
    },
  },
  {
    id: "cross-exchange",
    label: "Listed On Both",
    description: "Markets on both Polymarket AND Kalshi — spread candidates",
    filters: {
      sources: ["Both"],
      minVolume24h: 1_000,
    },
  },
  {
    id: "deep-liquidity",
    label: "Deep Liquidity Only",
    description: "Vol 24h ≥ $50K — traderable size available",
    filters: {
      minVolume24h: 50_000,
    },
  },
];
