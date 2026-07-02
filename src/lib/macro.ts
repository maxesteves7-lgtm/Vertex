/**
 * FRED macro ticker adapter.
 *
 * Pulls latest observations for a curated set of series from the St. Louis
 * Fed's FRED API (https://fred.stlouisfed.org/docs/api/fred/).
 *
 * FRED is free — the caller just needs an API key from
 * https://fredaccount.stlouisfed.org/apikey. If the key isn't configured
 * the API route returns `{configured: false}` and the ticker degrades to
 * a small setup hint instead of erroring.
 */

import { pool } from "./correlation";

const FRED_BASE = "https://api.stlouisfed.org/fred";

export type MacroTick = {
  id: string;
  /** Short display label for the ticker (uppercase). */
  label: string;
  /** Latest observed value. */
  value: number;
  /** Unit hint — controls how the value is formatted client-side. */
  unit: "%" | "idx";
  /** ISO-date string of the observation. */
  observedAt: string;
  /** Absolute change from the prior observation (or YoY change for CPI). */
  change: number | null;
  /** Signed % change from the prior observation. Null when not meaningful. */
  changePct: number | null;
  /** Short human tooltip shown on hover. */
  description: string;
};

type Kind = "level" | "cpiYoY";

type SeriesDef = {
  id: string;         // FRED series ID
  label: string;      // ticker display label
  unit: "%" | "idx";
  kind: Kind;
  description: string;
};

/**
 * The five headline macro tickers. Order = display order in the strip.
 * Adjust series IDs here to change the ticker contents without touching
 * the fetch logic.
 */
export const MACRO_SERIES: SeriesDef[] = [
  {
    id: "DFF",
    label: "FED FUNDS",
    unit: "%",
    kind: "level",
    description: "Effective Federal Funds Rate (daily, %)",
  },
  {
    id: "CPIAUCSL",
    label: "CPI YoY",
    unit: "%",
    kind: "cpiYoY",
    description: "Consumer Price Index — 12-month change",
  },
  {
    id: "DGS10",
    label: "10Y",
    unit: "%",
    kind: "level",
    description: "10-Year Treasury Constant Maturity Rate",
  },
  {
    id: "VIXCLS",
    label: "VIX",
    unit: "idx",
    kind: "level",
    description: "CBOE Volatility Index",
  },
  {
    id: "DTWEXBGS",
    label: "USD",
    unit: "idx",
    kind: "level",
    description: "Trade-Weighted US Dollar Index (Broad, Goods & Services)",
  },
];

type FredObs = { date: string; value: string };
type FredResp = { observations?: FredObs[] };

/**
 * Fetch a series' most recent observations. For a plain level we only need
 * the last two; for the CPI YoY calc we need 13 so we can compare against a
 * year ago. Missing values in FRED come through as ".".
 */
async function fetchSeriesObservations(
  apiKey: string,
  seriesId: string,
  count: number,
): Promise<Array<{ date: string; value: number }>> {
  const url = new URL(`${FRED_BASE}/series/observations`);
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", String(count));

  const res = await fetch(url.toString(), {
    // FRED updates infrequently; cache generously
    next: { revalidate: 300 },
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`FRED ${seriesId} returned ${res.status}`);
  }
  const data = (await res.json()) as FredResp;
  const raw = data.observations ?? [];
  return raw
    .map((o) => ({ date: o.date, value: parseFloat(o.value) }))
    .filter((o) => Number.isFinite(o.value));
}

export async function fetchMacroTicker(apiKey: string): Promise<MacroTick[]> {
  const ticks = await pool(MACRO_SERIES, 3, async (s) => {
    // CPI YoY needs 13 monthly obs; other series only need last 2 daily obs
    const count = s.kind === "cpiYoY" ? 13 : 2;
    let obs: Array<{ date: string; value: number }> = [];
    try {
      obs = await fetchSeriesObservations(apiKey, s.id, count);
    } catch {
      // Individual series failure shouldn't kill the whole ticker
    }
    return toTick(s, obs);
  });
  // Drop any series that returned no data at all so the strip stays clean
  return ticks.filter((t): t is MacroTick => t !== null);
}

function toTick(
  s: SeriesDef,
  obs: Array<{ date: string; value: number }>,
): MacroTick | null {
  if (obs.length === 0) return null;
  const latest = obs[0];

  if (s.kind === "cpiYoY") {
    // FRED returns newest-first. YoY = (latest / 12mo-prior − 1) × 100.
    // If we don't have 13 rows, fall back to whatever we do have.
    const prior = obs.length >= 13 ? obs[12] : obs[obs.length - 1];
    const yoy = ((latest.value / prior.value) - 1) * 100;
    const priorMonth = obs.length >= 2 ? obs[1] : null;
    const priorYoy =
      priorMonth && obs.length >= 14
        ? ((priorMonth.value / obs[13].value) - 1) * 100
        : null;
    const change =
      priorYoy !== null && Number.isFinite(priorYoy) ? yoy - priorYoy : null;
    return {
      id: s.id,
      label: s.label,
      value: yoy,
      unit: s.unit,
      observedAt: latest.date,
      change,
      changePct: null, // absolute pp change is more meaningful than % of %
      description: s.description,
    };
  }

  // Plain level series
  const prior = obs.length >= 2 ? obs[1] : null;
  const change = prior ? latest.value - prior.value : null;
  const changePct =
    prior && prior.value !== 0
      ? ((latest.value - prior.value) / Math.abs(prior.value)) * 100
      : null;
  return {
    id: s.id,
    label: s.label,
    value: latest.value,
    unit: s.unit,
    observedAt: latest.date,
    change,
    changePct,
    description: s.description,
  };
}
