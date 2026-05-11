"use client";

import { useEffect, useMemo, useState } from "react";

type Range = "1h" | "1d" | "1w" | "1m" | "max";
type PricePoint = { t: number; p: number };

const INTERVAL_FOR_RANGE: Record<Range, "1h" | "6h" | "1d" | "1w" | "1m" | "max"> =
  {
    "1h": "1h",
    "1d": "1h",
    "1w": "6h",
    "1m": "1d",
    max: "max",
  };

const RANGE_LABEL: Record<Range, string> = {
  "1h": "1H",
  "1d": "24H",
  "1w": "7D",
  "1m": "30D",
  max: "ALL",
};

/**
 * Inline SVG sparkline price chart. Lightweight (no chart library) so it
 * keeps the terminal feel — sharp lines, no animations, monospace ticks.
 */
export function PriceChart({ tokenId }: { tokenId: string | null }) {
  const [range, setRange] = useState<Range>("1d");
  const [history, setHistory] = useState<PricePoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tokenId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const interval = INTERVAL_FOR_RANGE[range];
    fetch(`/api/price-history?tokenId=${encodeURIComponent(tokenId)}&interval=${interval}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`feed returned ${res.status}`);
        return (await res.json()) as { history: PricePoint[] };
      })
      .then((data) => {
        if (cancelled) return;
        let pts = data.history ?? [];
        // Slice to the visible range
        const now = Math.floor(Date.now() / 1000);
        const cutoff: Record<Range, number> = {
          "1h": now - 60 * 60,
          "1d": now - 24 * 60 * 60,
          "1w": now - 7 * 24 * 60 * 60,
          "1m": now - 30 * 24 * 60 * 60,
          max: 0,
        };
        if (range !== "max") {
          pts = pts.filter((pt) => pt.t >= cutoff[range]);
        }
        setHistory(pts);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "feed error");
        setHistory([]);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tokenId, range]);

  const stats = useMemo(() => {
    if (!history || history.length === 0) return null;
    const last = history[history.length - 1].p;
    const first = history[0].p;
    const change = last - first;
    const changePct = first === 0 ? 0 : change / first;
    const min = Math.min(...history.map((p) => p.p));
    const max = Math.max(...history.map((p) => p.p));
    return { last, first, change, changePct, min, max };
  }, [history]);

  if (!tokenId) {
    return (
      <div className="border border-[var(--border)] bg-black h-44 flex items-center justify-center text-[var(--fg-dim)] text-xs">
        NO TOKEN ID FROM EXCHANGE — CHART UNAVAILABLE
      </div>
    );
  }

  return (
    <div>
      {/* Range tabs */}
      <div className="flex items-center gap-1 mb-2">
        {(["1h", "1d", "1w", "1m", "max"] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-sm border transition-colors ${
              range === r
                ? "bg-[var(--accent-primary)] text-black border-[var(--accent-primary)]"
                : "border-[var(--border)] text-[var(--fg-dim)] hover:text-[var(--fg)] hover:border-[var(--fg-dim)]"
            }`}
          >
            {RANGE_LABEL[r]}
          </button>
        ))}
        {stats && (
          <div className="ml-auto text-[10px] uppercase tracking-wider flex items-center gap-2">
            <span className="text-[var(--fg-dim)]">Δ</span>
            <span
              className={
                stats.change >= 0
                  ? "text-[var(--accent-up)] font-semibold"
                  : "text-[var(--accent-down)] font-semibold"
              }
            >
              {stats.change >= 0 ? "+" : ""}
              {(stats.change * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Chart area */}
      <div className="border border-[var(--border)] bg-black h-44 relative">
        {loading && history === null && (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--fg-dim)] text-xs">
            LOADING…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--accent-down)] text-xs">
            FEED ERROR · {error}
          </div>
        )}
        {history && history.length === 0 && !loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--fg-dim)] text-xs">
            NO DATA IN RANGE
          </div>
        )}
        {history && history.length > 1 && stats && (
          <SparkLine points={history} min={stats.min} max={stats.max} />
        )}
        {/* Right-edge price label */}
        {stats && (
          <div className="absolute top-1 right-2 text-[10px] text-[var(--fg-dim)] font-mono">
            <div>
              <span className="text-[var(--fg)]">
                {(stats.last * 100).toFixed(1)}%
              </span>
            </div>
            <div className="text-right">
              <span>H {(stats.max * 100).toFixed(1)}</span>
            </div>
            <div className="text-right">
              <span>L {(stats.min * 100).toFixed(1)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SparkLine({
  points,
  min,
  max,
}: {
  points: PricePoint[];
  min: number;
  max: number;
}) {
  const W = 460;
  const H = 176;
  const PADX = 4;
  const PADY = 8;
  const innerW = W - PADX * 2;
  const innerH = H - PADY * 2;

  const xMin = points[0].t;
  const xMax = points[points.length - 1].t;
  const xRange = xMax - xMin || 1;
  const yRange = max - min || 1;

  const path = points
    .map((pt, i) => {
      const x = PADX + ((pt.t - xMin) / xRange) * innerW;
      const y = PADY + (1 - (pt.p - min) / yRange) * innerH;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  // Area under curve
  const lastX = PADX + innerW;
  const baseY = PADY + innerH;
  const areaPath = `${path} L ${lastX.toFixed(1)} ${baseY.toFixed(1)} L ${PADX.toFixed(1)} ${baseY.toFixed(1)} Z`;

  // 50% reference line (probability midline)
  const midY = PADY + (1 - (0.5 - min) / yRange) * innerH;
  const showMid = midY > PADY && midY < PADY + innerH;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="block w-full h-full"
    >
      {showMid && (
        <line
          x1={PADX}
          x2={W - PADX}
          y1={midY}
          y2={midY}
          stroke="var(--border)"
          strokeDasharray="2 3"
          strokeWidth={0.7}
        />
      )}
      <path d={areaPath} fill="var(--accent-primary)" opacity={0.08} />
      <path
        d={path}
        fill="none"
        stroke="var(--accent-primary)"
        strokeWidth={1.4}
      />
    </svg>
  );
}
