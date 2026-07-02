"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Range = "1h" | "1d" | "1w" | "1m" | "max";
type Mode = "line" | "ohlc";
type PricePoint = { t: number; p: number };

/** Aggregated candle bucket (client-side derived from ticks). */
type Candle = {
  /** Bucket start time (unix seconds). */
  t: number;
  open: number;
  high: number;
  low: number;
  close: number;
  /** Number of price ticks that fell in this bucket — honest activity proxy. */
  ticks: number;
};

/**
 * Polymarket CLOB `prices-history` interval fed to the API. Chosen per
 * range to control fidelity — finer intervals for shorter ranges so we
 * have enough ticks to form real OHLC bars.
 */
const INTERVAL_FOR_RANGE: Record<Range, "1h" | "6h" | "1d" | "1w" | "1m" | "max"> =
  {
    "1h": "1h",
    "1d": "1h",
    "1w": "6h",
    "1m": "1d",
    max: "max",
  };

/** Target number of OHLC buckets to draw for each range. */
const TARGET_CANDLES: Record<Range, number> = {
  "1h": 30,
  "1d": 40,
  "1w": 42,
  "1m": 30,
  max: 60,
};

const RANGE_LABEL: Record<Range, string> = {
  "1h": "1H",
  "1d": "1D",
  "1w": "1W",
  "1m": "1M",
  max: "ALL",
};

/**
 * Institutional-grade price chart. Pure SVG (no chart library), Bloomberg
 * aesthetic, tabular-mono readout. LINE mode is a sparkline; OHLC mode
 * buckets the raw ticks into candles. Both modes share a crosshair with a
 * tooltip and an activity strip below.
 *
 * Volume: the Polymarket CLOB `prices-history` endpoint returns only price
 * ticks, not per-bucket USD volume. Instead of faking that, we surface
 * TICK DENSITY per bucket in the activity strip — real signal, honestly
 * labeled. USD-per-candle would need a separate trade-bucketing pass over
 * the Data API `/trades` endpoint (next push).
 */
export function PriceChart({ tokenId }: { tokenId: string | null }) {
  const [range, setRange] = useState<Range>("1d");
  const [mode, setMode] = useState<Mode>("line");
  const [history, setHistory] = useState<PricePoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ---- Fetch ----
  useEffect(() => {
    if (!tokenId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const interval = INTERVAL_FOR_RANGE[range];
    fetch(
      `/api/price-history?tokenId=${encodeURIComponent(tokenId)}&interval=${interval}`,
    )
      .then(async (res) => {
        if (!res.ok) throw new Error(`feed returned ${res.status}`);
        return (await res.json()) as { history: PricePoint[] };
      })
      .then((data) => {
        if (cancelled) return;
        let pts = data.history ?? [];
        // Trim to visible window
        const now = Math.floor(Date.now() / 1000);
        const cutoff: Record<Range, number> = {
          "1h": now - 60 * 60,
          "1d": now - 24 * 60 * 60,
          "1w": now - 7 * 24 * 60 * 60,
          "1m": now - 30 * 24 * 60 * 60,
          max: 0,
        };
        if (range !== "max") pts = pts.filter((pt) => pt.t >= cutoff[range]);
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

  // ---- Derived data ----
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

  const candles = useMemo<Candle[]>(() => {
    if (!history || history.length === 0) return [];
    const target = TARGET_CANDLES[range];
    const xMin = history[0].t;
    const xMax = history[history.length - 1].t;
    const span = Math.max(1, xMax - xMin);
    const bucketSize = span / target;

    const buckets: Candle[] = [];
    let bucketIdx = 0;
    for (const pt of history) {
      const idx = Math.min(
        target - 1,
        Math.floor((pt.t - xMin) / bucketSize),
      );
      while (buckets.length <= idx) {
        buckets.push({
          t: xMin + bucketSize * buckets.length,
          open: NaN,
          high: -Infinity,
          low: Infinity,
          close: NaN,
          ticks: 0,
        });
      }
      const c = buckets[idx];
      if (Number.isNaN(c.open)) c.open = pt.p;
      c.close = pt.p;
      if (pt.p > c.high) c.high = pt.p;
      if (pt.p < c.low) c.low = pt.p;
      c.ticks += 1;
      bucketIdx = idx;
    }
    // Forward-fill empty buckets with prior close so line is continuous
    let lastClose = history[0].p;
    for (const c of buckets) {
      if (Number.isNaN(c.open)) {
        c.open = c.close = c.high = c.low = lastClose;
      } else {
        lastClose = c.close;
      }
    }
    return buckets;
  }, [history, range]);

  if (!tokenId) {
    return (
      <div className="border border-[var(--border)] bg-black h-56 flex items-center justify-center text-[var(--fg-mute)] text-[11px] font-mono tracking-wider">
        NO POLYMARKET TOKEN — CHART UNAVAILABLE
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar: mode toggle · range presets · delta readout */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <div className="flex items-center border border-[var(--border)] rounded-sm overflow-hidden font-mono text-[10px] tracking-[0.12em]">
          <button
            onClick={() => setMode("line")}
            className={`px-2 py-0.5 transition-colors ${
              mode === "line"
                ? "bg-[var(--accent-primary)] text-black"
                : "text-[var(--fg-dim)] hover:text-white"
            }`}
          >
            LINE
          </button>
          <button
            onClick={() => setMode("ohlc")}
            className={`px-2 py-0.5 border-l border-[var(--border)] transition-colors ${
              mode === "ohlc"
                ? "bg-[var(--accent-primary)] text-black"
                : "text-[var(--fg-dim)] hover:text-white"
            }`}
          >
            OHLC
          </button>
        </div>

        <div className="flex items-center gap-0.5">
          {(["1h", "1d", "1w", "1m", "max"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2 py-0.5 text-[10px] font-mono tracking-[0.12em] rounded-sm border transition-colors ${
                range === r
                  ? "bg-[var(--accent-primary)] text-black border-[var(--accent-primary)]"
                  : "border-[var(--border)] text-[var(--fg-dim)] hover:text-white hover:border-[var(--fg-dim)]"
              }`}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>

        {stats && (
          <div className="ml-auto text-[10px] font-mono uppercase tracking-wider flex items-center gap-2 tabular-nums">
            <span className="text-[var(--fg-mute)]">Δ</span>
            <span
              className={
                stats.change >= 0
                  ? "text-[var(--accent-up)] font-semibold"
                  : "text-[var(--accent-down)] font-semibold"
              }
            >
              {stats.change >= 0 ? "+" : ""}
              {(stats.change * 100).toFixed(1)}pp
            </span>
          </div>
        )}
      </div>

      {/* Chart body */}
      <div className="border border-[var(--border)] bg-black relative">
        {loading && history === null && (
          <div className="h-56 flex items-center justify-center text-[var(--fg-dim)] text-[11px] font-mono tracking-wider">
            LOADING…
          </div>
        )}
        {error && (
          <div className="h-56 flex items-center justify-center text-[var(--accent-down)] text-[11px] font-mono tracking-wider">
            FEED ERROR · {error}
          </div>
        )}
        {history && history.length === 0 && !loading && !error && (
          <div className="h-56 flex items-center justify-center text-[var(--fg-mute)] text-[11px] font-mono tracking-wider">
            NO DATA IN RANGE
          </div>
        )}
        {history && history.length > 1 && stats && (
          <ChartCanvas
            mode={mode}
            history={history}
            candles={candles}
            stats={stats}
            range={range}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas
// ─────────────────────────────────────────────────────────────────────────────

const W = 700;
const H = 240;
const ACT_H = 30; // activity strip
const PAD_TOP = 8;
const PAD_BOT = 22; // room for x-axis labels
const PAD_LEFT = 4;
const PAD_RIGHT = 44; // room for y-axis price labels
const MAIN_H = H - PAD_TOP - PAD_BOT - ACT_H - 4;

const GRID_LEVELS = [0, 0.25, 0.5, 0.75, 1]; // Y gridlines at these probabilities

function ChartCanvas({
  mode,
  history,
  candles,
  stats,
  range,
}: {
  mode: Mode;
  history: PricePoint[];
  candles: Candle[];
  stats: { last: number; min: number; max: number };
  range: Range;
}) {
  const [hover, setHover] = useState<{
    xPct: number;
    idx: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const xMin = history[0].t;
  const xMax = history[history.length - 1].t;
  const xRange = xMax - xMin || 1;

  // Y range: pad the min/max slightly so lines don't hug the edges. Never
  // exceed [0, 1] since these are probabilities.
  const yLo = Math.max(0, stats.min - 0.05);
  const yHi = Math.min(1, stats.max + 0.05);
  const yRange = yHi - yLo || 1;

  const innerW = W - PAD_LEFT - PAD_RIGHT;
  const chartTop = PAD_TOP;
  const chartBot = chartTop + MAIN_H;
  const actTop = chartBot + 4;
  const actBot = actTop + ACT_H;

  function xOf(t: number) {
    return PAD_LEFT + ((t - xMin) / xRange) * innerW;
  }
  function yOf(p: number) {
    return chartTop + (1 - (p - yLo) / yRange) * MAIN_H;
  }

  // Line path
  const linePath = history
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${xOf(pt.t).toFixed(1)} ${yOf(pt.p).toFixed(1)}`)
    .join(" ");
  const lineLastX = xOf(history[history.length - 1].t);
  const areaPath = `${linePath} L ${lineLastX.toFixed(1)} ${chartBot.toFixed(1)} L ${xOf(history[0].t).toFixed(1)} ${chartBot.toFixed(1)} Z`;

  // Candle width
  const candleW = Math.max(2, (innerW / Math.max(candles.length, 1)) * 0.72);

  // Activity strip — normalize to max ticks
  const maxTicks = Math.max(1, ...candles.map((c) => c.ticks));

  // Hover computation
  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const clampedX = Math.max(PAD_LEFT, Math.min(PAD_LEFT + innerW, relX));
    const xPct = (clampedX - PAD_LEFT) / innerW;
    // For OHLC → snap to nearest candle. For LINE → snap to nearest point.
    let idx: number;
    if (mode === "ohlc") {
      idx = Math.min(
        candles.length - 1,
        Math.max(0, Math.round(xPct * (candles.length - 1))),
      );
    } else {
      idx = Math.min(
        history.length - 1,
        Math.max(0, Math.round(xPct * (history.length - 1))),
      );
    }
    setHover({ xPct, idx });
  }
  function onLeave() {
    setHover(null);
  }

  // Time markers along x-axis — 4 ticks
  const xTicks: Array<{ x: number; label: string }> = [];
  for (let i = 0; i < 4; i++) {
    const frac = i / 3;
    const t = xMin + xRange * frac;
    xTicks.push({ x: xOf(t), label: fmtAxisTime(t, range) });
  }

  const tooltip = hover ? computeTooltip(hover.idx, mode, history, candles) : null;

  return (
    <div className="relative select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block w-full"
        style={{ height: H }}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        {/* Y gridlines */}
        {GRID_LEVELS.map((lvl) => {
          if (lvl < yLo || lvl > yHi) return null;
          const y = yOf(lvl);
          return (
            <g key={lvl}>
              <line
                x1={PAD_LEFT}
                x2={PAD_LEFT + innerW}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeWidth={0.6}
                strokeDasharray={lvl === 0.5 ? "3 3" : "1 3"}
              />
              <text
                x={PAD_LEFT + innerW + 4}
                y={y + 3}
                fill="var(--fg-mute)"
                fontSize={9}
                fontFamily="var(--font-mono)"
              >
                {(lvl * 100).toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* X gridlines / time markers */}
        {xTicks.map((tk, i) => (
          <g key={i}>
            <line
              x1={tk.x}
              x2={tk.x}
              y1={chartTop}
              y2={chartBot}
              stroke="var(--border-soft)"
              strokeWidth={0.5}
            />
            <text
              x={tk.x}
              y={H - 8}
              fill="var(--fg-mute)"
              fontSize={9}
              fontFamily="var(--font-mono)"
              textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
            >
              {tk.label}
            </text>
          </g>
        ))}

        {/* Line mode area + line */}
        {mode === "line" && (
          <>
            <path d={areaPath} fill="var(--accent-primary)" opacity={0.08} />
            <path
              d={linePath}
              fill="none"
              stroke="var(--accent-primary)"
              strokeWidth={1.5}
            />
          </>
        )}

        {/* OHLC candles */}
        {mode === "ohlc" &&
          candles.map((c, i) => {
            const x = xOf(c.t + (xRange / Math.max(candles.length, 1)) / 2);
            const up = c.close >= c.open;
            const color = up ? "var(--accent-up)" : "var(--accent-down)";
            const bodyTop = yOf(Math.max(c.open, c.close));
            const bodyBot = yOf(Math.min(c.open, c.close));
            const bodyH = Math.max(1, bodyBot - bodyTop);
            return (
              <g key={i}>
                {/* Wick */}
                <line
                  x1={x}
                  x2={x}
                  y1={yOf(c.high)}
                  y2={yOf(c.low)}
                  stroke={color}
                  strokeWidth={1}
                />
                {/* Body */}
                <rect
                  x={x - candleW / 2}
                  y={bodyTop}
                  width={candleW}
                  height={bodyH}
                  fill={color}
                  opacity={up ? 0.9 : 0.9}
                />
              </g>
            );
          })}

        {/* Activity strip */}
        <line
          x1={PAD_LEFT}
          x2={PAD_LEFT + innerW}
          y1={actTop}
          y2={actTop}
          stroke="var(--border)"
          strokeWidth={0.6}
        />
        <text
          x={PAD_LEFT}
          y={actTop + 10}
          fill="var(--fg-mute)"
          fontSize={8}
          fontFamily="var(--font-mono)"
          letterSpacing={1}
        >
          TICKS
        </text>
        {candles.map((c, i) => {
          const x = xOf(c.t + (xRange / Math.max(candles.length, 1)) / 2);
          const h = (c.ticks / maxTicks) * (ACT_H - 4);
          return (
            <rect
              key={i}
              x={x - candleW / 2}
              y={actBot - h}
              width={candleW}
              height={h}
              fill="var(--fg-mute)"
              opacity={0.6}
            />
          );
        })}

        {/* Crosshair */}
        {hover && (
          <CrosshairLayer
            mode={mode}
            hover={hover}
            history={history}
            candles={candles}
            xOf={xOf}
            yOf={yOf}
            chartTop={chartTop}
            chartBot={chartBot}
            padLeft={PAD_LEFT}
            innerW={innerW}
          />
        )}

        {/* Last price marker on right edge */}
        <g>
          <line
            x1={PAD_LEFT + innerW - 40}
            x2={PAD_LEFT + innerW}
            y1={yOf(stats.last)}
            y2={yOf(stats.last)}
            stroke="var(--accent-primary)"
            strokeWidth={0.6}
            strokeDasharray="2 2"
          />
          <rect
            x={PAD_LEFT + innerW - 2}
            y={yOf(stats.last) - 7}
            width={38}
            height={14}
            fill="var(--accent-primary)"
          />
          <text
            x={PAD_LEFT + innerW + 17}
            y={yOf(stats.last) + 3}
            fill="black"
            fontSize={10}
            fontFamily="var(--font-mono)"
            textAnchor="middle"
            fontWeight={600}
          >
            {(stats.last * 100).toFixed(1)}
          </text>
        </g>
      </svg>

      {/* HTML tooltip pinned to hover x */}
      {tooltip && hover && (
        <div
          className="pointer-events-none absolute top-2 z-10 border border-[var(--border)] bg-[var(--bg-elev)] px-2 py-1 font-mono text-[10px] tracking-[0.06em]"
          style={{
            left: `${(hover.xPct * (100 - (PAD_RIGHT / W) * 100) + (PAD_LEFT / W) * 100).toFixed(2)}%`,
            transform:
              hover.xPct > 0.7 ? "translateX(-105%)" : "translateX(6px)",
            minWidth: 140,
          }}
        >
          <div className="text-[var(--fg-mute)] mb-0.5">{tooltip.timeLabel}</div>
          {tooltip.rows.map(([k, v, cls]) => (
            <div
              key={k}
              className="flex items-center justify-between gap-2 tabular-nums"
            >
              <span className="text-[var(--fg-mute)]">{k}</span>
              <span className={cls ?? "text-white"}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CrosshairLayer({
  mode,
  hover,
  history,
  candles,
  xOf,
  yOf,
  chartTop,
  chartBot,
  padLeft,
  innerW,
}: {
  mode: Mode;
  hover: { xPct: number; idx: number };
  history: PricePoint[];
  candles: Candle[];
  xOf: (t: number) => number;
  yOf: (p: number) => number;
  chartTop: number;
  chartBot: number;
  padLeft: number;
  innerW: number;
}) {
  let x: number;
  let y: number;
  if (mode === "ohlc") {
    const c = candles[hover.idx];
    x = xOf(c.t);
    y = yOf(c.close);
  } else {
    const pt = history[hover.idx];
    x = xOf(pt.t);
    y = yOf(pt.p);
  }
  return (
    <g pointerEvents="none">
      <line
        x1={x}
        x2={x}
        y1={chartTop}
        y2={chartBot}
        stroke="var(--fg-dim)"
        strokeWidth={0.6}
        strokeDasharray="2 3"
      />
      <line
        x1={padLeft}
        x2={padLeft + innerW}
        y1={y}
        y2={y}
        stroke="var(--fg-dim)"
        strokeWidth={0.6}
        strokeDasharray="2 3"
      />
      <circle cx={x} cy={y} r={2.5} fill="var(--accent-primary)" />
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function computeTooltip(
  idx: number,
  mode: Mode,
  history: PricePoint[],
  candles: Candle[],
): {
  timeLabel: string;
  rows: Array<[string, string, string?]>;
} | null {
  if (mode === "ohlc") {
    const c = candles[idx];
    if (!c) return null;
    const up = c.close >= c.open;
    const cls = up ? "text-[var(--accent-up)]" : "text-[var(--accent-down)]";
    return {
      timeLabel: fmtTooltipTime(c.t),
      rows: [
        ["O", `${(c.open * 100).toFixed(1)}%`],
        ["H", `${(c.high * 100).toFixed(1)}%`],
        ["L", `${(c.low * 100).toFixed(1)}%`],
        ["C", `${(c.close * 100).toFixed(1)}%`, cls],
        ["TICKS", `${c.ticks}`],
      ],
    };
  }
  const pt = history[idx];
  if (!pt) return null;
  const prev = idx > 0 ? history[idx - 1].p : pt.p;
  const delta = pt.p - prev;
  const cls =
    delta >= 0 ? "text-[var(--accent-up)]" : "text-[var(--accent-down)]";
  return {
    timeLabel: fmtTooltipTime(pt.t),
    rows: [
      ["PX", `${(pt.p * 100).toFixed(2)}%`],
      [
        "Δ",
        `${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(2)}pp`,
        cls,
      ],
    ],
  };
}

/** X-axis tick — coarse label appropriate to the range. */
function fmtAxisTime(t: number, range: Range): string {
  const d = new Date(t * 1000);
  if (range === "1h" || range === "1d") {
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (range === "1w") {
    return d.toLocaleDateString(undefined, {
      weekday: "short",
    });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Tooltip time — precise. */
function fmtTooltipTime(t: number): string {
  const d = new Date(t * 1000);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
