/**
 * Time-series correlation math for prediction market prices.
 *
 * Prediction markets don't return prices on a fixed grid — CLOB emits a point
 * whenever a trade or order changes the mid. To correlate two markets we
 * first snap both series onto a common hourly grid (last-observation-carried-
 * forward within each bucket) and then compute Pearson ρ over the aligned
 * pairs. Pairs with fewer than MIN_ALIGNED overlapping buckets are rejected
 * so we don't publish coefficients that were computed off a handful of ticks.
 */

export type PricePoint = { t: number; p: number };

/** Minimum aligned buckets required before we'll publish a ρ. */
export const MIN_ALIGNED = 20;

/**
 * Snap a series of raw ticks onto a uniform time grid of `bucketSize`
 * seconds spanning [gridStart, gridEnd]. Each bucket takes the LAST price
 * observed within it; empty buckets get carried-forward from the prior
 * observation. Returns an array of length ceil((gridEnd-gridStart)/bucketSize)
 * with `null` where no observation exists AND no prior carry is available.
 */
export function bucketSeries(
  points: PricePoint[],
  gridStart: number,
  gridEnd: number,
  bucketSize: number,
): Array<number | null> {
  const buckets = Math.max(1, Math.ceil((gridEnd - gridStart) / bucketSize));
  const out: Array<number | null> = new Array(buckets).fill(null);

  // Sort defensively (Polymarket usually returns ascending)
  const sorted = points.slice().sort((a, b) => a.t - b.t);

  // Assign the last price in each bucket
  for (const pt of sorted) {
    if (pt.t < gridStart || pt.t > gridEnd) continue;
    const idx = Math.min(
      buckets - 1,
      Math.max(0, Math.floor((pt.t - gridStart) / bucketSize)),
    );
    out[idx] = pt.p;
  }

  // Forward-fill from prior known value, so a bucket with no new price
  // inherits the previous bucket's close.
  let last: number | null = null;
  // Seed with the last price observed BEFORE the grid, if any
  for (const pt of sorted) {
    if (pt.t < gridStart) last = pt.p;
    else break;
  }
  for (let i = 0; i < buckets; i++) {
    if (out[i] === null) out[i] = last;
    else last = out[i];
  }
  return out;
}

/**
 * Pearson correlation coefficient between two aligned series. Returns null
 * if there aren't enough overlapping (non-null) pairs, or if either series
 * has zero variance across those pairs (constant series → correlation is
 * undefined, not "very correlated").
 */
export function pearson(
  a: Array<number | null>,
  b: Array<number | null>,
): { rho: number; n: number } | null {
  if (a.length !== b.length) return null;

  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < a.length; i++) {
    const av = a[i];
    const bv = b[i];
    if (av === null || bv === null) continue;
    xs.push(av);
    ys.push(bv);
  }
  const n = xs.length;
  if (n < MIN_ALIGNED) return null;

  let sumX = 0,
    sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0,
    sxx = 0,
    syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return null;

  const rho = num / Math.sqrt(sxx * syy);
  // Numerical clamp — rounding can drift outside [-1, 1] by 1e-16
  const clamped = Math.max(-1, Math.min(1, rho));
  return { rho: clamped, n };
}

/**
 * Run promises with a concurrency cap so we don't overwhelm the upstream
 * CLOB API when correlating one market against 30 candidates.
 */
export async function pool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function next(): Promise<void> {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await worker(items[idx], idx);
    }
  }

  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => next(),
  );
  await Promise.all(runners);
  return results;
}
