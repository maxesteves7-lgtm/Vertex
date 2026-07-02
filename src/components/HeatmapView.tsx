"use client";

import { useEffect, useMemo, useState } from "react";
import { CATEGORY_TREE } from "@/lib/categories";

type Market = {
  tokenId: string;
  question: string;
  category: string;
  volume24h: number | null;
};

type HeatmapResp = {
  window: "7d" | "30d" | "90d";
  category: string;
  markets: Market[];
  matrix: number[][];
  generatedAt: string;
  empty?: boolean;
};

type Window = "7d" | "30d" | "90d";

/**
 * Global correlation heatmap — N×N grid of Pearson ρ between the top-volume
 * markets in a chosen category, computed against the persisted
 * PriceObservation table. Category = "All" is the cross-category view.
 *
 * Colors: strong positive = green, near zero = neutral dark, strong negative
 * = red. Diagonal always ρ=1 (each market vs itself).
 */
export function HeatmapView() {
  const [category, setCategory] = useState<string>("All");
  const [timeWindow, setTimeWindow] = useState<Window>("30d");
  const [data, setData] = useState<HeatmapResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<{
    i: number;
    j: number;
    x: number;
    y: number;
  } | null>(null);
  const [priming, setPriming] = useState(false);
  const [primeMsg, setPrimeMsg] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    fetch(
      `/api/heatmap?category=${encodeURIComponent(category)}&window=${timeWindow}&max=25`,
      { signal: ctrl.signal },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error(`heatmap feed returned ${r.status}`);
        return (await r.json()) as HeatmapResp;
      })
      .then((d) => setData(d))
      .catch((e) => {
        if ((e as Error).name === "AbortError") return;
        setError(e instanceof Error ? e.message : "heatmap error");
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [category, timeWindow]);

  async function primeBackfill() {
    setPriming(true);
    setPrimeMsg("Running backfill — this can take up to a minute…");
    try {
      const res = await fetch("/api/heatmap/backfill");
      // Read as text first so we can display the real body even if it's not JSON
      const rawText = await res.text();
      let json:
        | {
            ok?: boolean;
            markets?: number;
            inserted?: number;
            elapsedMs?: number;
            error?: string;
          }
        | null = null;
      try {
        json = JSON.parse(rawText);
      } catch {
        /* not JSON */
      }
      if (!res.ok) {
        const detail =
          json?.error ??
          rawText.slice(0, 240) ??
          `HTTP ${res.status}`;
        setPrimeMsg(`Backfill failed (HTTP ${res.status}) · ${detail}`);
        setPriming(false);
        return;
      }
      setPrimeMsg(
        `Backfill done · ${json?.markets ?? 0} markets · ${json?.inserted ?? 0} new observations · ${((json?.elapsedMs ?? 0) / 1000).toFixed(1)}s. Reloading…`,
      );
      // Force a data refresh
      const bump = timeWindow;
      setTimeWindow(bump === "7d" ? "30d" : "7d");
      setTimeout(() => setTimeWindow(bump), 400);
      setTimeout(() => {
        setPriming(false);
        setPrimeMsg(null);
      }, 4000);
    } catch (e) {
      setPrimeMsg(
        `Backfill request failed: ${e instanceof Error ? e.message : "unknown"}`,
      );
      setPriming(false);
    }
  }

  const isEmpty = data && (data.empty || data.markets.length < 2);

  return (
    <section className="flex-1 flex flex-col px-4 md:px-6 py-5 min-h-0">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-5">
        <div>
          <h1 className="text-[20px] font-semibold text-white tracking-tight">
            Correlation Heatmap
          </h1>
          <p className="text-[12px] text-[var(--fg-dim)] mt-0.5">
            N×N Pearson ρ across the top-volume Polymarket markets, computed
            from persisted hourly observations. Backfill runs nightly.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Category */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-sm px-3 py-1.5 text-[12px] text-white outline-none font-mono tracking-wider"
          >
            <option value="All">All Categories</option>
            {CATEGORY_TREE.map((n) => (
              <option key={n.bucket} value={n.bucket}>
                {n.display}
              </option>
            ))}
          </select>
          {/* Window */}
          <div className="flex items-center border border-[var(--border)] rounded-sm overflow-hidden font-mono text-[10px] tracking-[0.12em]">
            {(["7d", "30d", "90d"] as Window[]).map((w) => (
              <button
                key={w}
                onClick={() => setTimeWindow(w)}
                className={`px-2.5 py-1 transition-colors ${
                  timeWindow === w
                    ? "bg-[var(--accent-primary)] text-black"
                    : "text-[var(--fg-dim)] hover:text-white border-l border-[var(--border)] first:border-l-0"
                }`}
              >
                {w.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* States */}
      {loading && !data ? (
        <Msg tone="dim">LOADING…</Msg>
      ) : error ? (
        <Msg tone="down">FEED ERROR · {error}</Msg>
      ) : isEmpty ? (
        <EmptyState
          onPrime={primeBackfill}
          priming={priming}
          message={primeMsg}
        />
      ) : (
        data && (
          <>
            <MatrixGrid
              markets={data.markets}
              matrix={data.matrix}
              hover={hover}
              setHover={setHover}
            />
            <Legend />
            <div className="mt-3 flex items-center justify-between font-mono text-[10px] tracking-[0.12em] text-[var(--fg-mute)]">
              <span>
                {data.markets.length} MARKETS · {data.window.toUpperCase()} · GENERATED{" "}
                {new Date(data.generatedAt).toLocaleTimeString()}
              </span>
              <button
                onClick={primeBackfill}
                disabled={priming}
                className="px-2.5 py-1 border border-[var(--border)] rounded-sm hover:text-white disabled:opacity-50"
              >
                {priming ? "BACKFILLING…" : "RUN BACKFILL"}
              </button>
            </div>
            {primeMsg && (
              <div className="mt-2 font-mono text-[10px] tracking-[0.12em] text-[var(--accent-primary)]">
                {primeMsg}
              </div>
            )}
          </>
        )
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Matrix
// ─────────────────────────────────────────────────────────────────────────────

function MatrixGrid({
  markets,
  matrix,
  hover,
  setHover,
}: {
  markets: Market[];
  matrix: number[][];
  hover: { i: number; j: number; x: number; y: number } | null;
  setHover: (
    v: { i: number; j: number; x: number; y: number } | null,
  ) => void;
}) {
  const N = markets.length;
  const CELL = 18;
  const LABEL_W = 200;
  const LABEL_H = 100; // for rotated x labels

  const W = LABEL_W + N * CELL + 8;
  const H = LABEL_H + N * CELL + 8;

  return (
    <div className="relative overflow-auto border border-[var(--border)] bg-black">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ minWidth: W, height: H }}>
        {/* X labels — rotated */}
        {markets.map((m, i) => {
          const x = LABEL_W + i * CELL + CELL / 2;
          const y = LABEL_H - 4;
          return (
            <text
              key={`x-${i}`}
              x={x}
              y={y}
              transform={`rotate(-60 ${x} ${y})`}
              fontSize={9}
              fontFamily="var(--font-mono)"
              fill={
                hover && (hover.i === i || hover.j === i)
                  ? "var(--accent-primary)"
                  : "var(--fg-dim)"
              }
              textAnchor="end"
            >
              {truncate(m.question, 30)}
            </text>
          );
        })}

        {/* Y labels */}
        {markets.map((m, i) => {
          const y = LABEL_H + i * CELL + CELL / 2 + 3;
          return (
            <text
              key={`y-${i}`}
              x={LABEL_W - 4}
              y={y}
              fontSize={9}
              fontFamily="var(--font-mono)"
              fill={
                hover && (hover.i === i || hover.j === i)
                  ? "var(--accent-primary)"
                  : "var(--fg-dim)"
              }
              textAnchor="end"
            >
              {truncate(m.question, 30)}
            </text>
          );
        })}

        {/* Cells */}
        {matrix.map((row, i) =>
          row.map((rho, j) => {
            const x = LABEL_W + j * CELL;
            const y = LABEL_H + i * CELL;
            const isDiag = i === j;
            const fill = cellColor(rho);
            const focused =
              !!hover && (hover.i === i || hover.j === j || (hover.i === i && hover.j === j));
            return (
              <rect
                key={`c-${i}-${j}`}
                x={x + 0.5}
                y={y + 0.5}
                width={CELL - 1}
                height={CELL - 1}
                fill={fill}
                stroke={focused ? "var(--accent-primary)" : "transparent"}
                strokeWidth={focused ? 1 : 0}
                onMouseEnter={(e) =>
                  setHover({
                    i,
                    j,
                    x: e.clientX,
                    y: e.clientY,
                  })
                }
                onMouseMove={(e) =>
                  setHover({
                    i,
                    j,
                    x: e.clientX,
                    y: e.clientY,
                  })
                }
                onMouseLeave={() => setHover(null)}
                style={{ cursor: isDiag ? "default" : "crosshair" }}
              />
            );
          }),
        )}
      </svg>

      {/* Tooltip */}
      {hover && (
        <div
          className="pointer-events-none fixed z-40 border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 font-mono text-[10px] tracking-[0.06em] shadow-2xl"
          style={{
            left: Math.min(hover.x + 12, window.innerWidth - 280),
            top: Math.min(hover.y + 12, window.innerHeight - 100),
            width: 260,
          }}
        >
          <div className="text-[var(--fg-mute)] mb-1">X vs Y</div>
          <div className="text-white truncate">
            X: {markets[hover.j].question}
          </div>
          <div className="text-white truncate mb-1">
            Y: {markets[hover.i].question}
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[var(--fg-mute)]">ρ</span>
            <span
              className="font-semibold tabular-nums"
              style={{ color: rhoColor(matrix[hover.i][hover.j]) }}
            >
              {formatRho(matrix[hover.i][hover.j])}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function Legend() {
  const stops = [
    { rho: -1, label: "-1.0" },
    { rho: -0.5, label: "-0.5" },
    { rho: 0, label: "0" },
    { rho: 0.5, label: "+0.5" },
    { rho: 1, label: "+1.0" },
  ];
  return (
    <div className="mt-4 flex items-center gap-3 font-mono text-[10px] tracking-[0.12em] text-[var(--fg-mute)]">
      <span>ρ SCALE</span>
      <div className="flex items-stretch h-4">
        {stops.slice(0, -1).map((s, i) => (
          <div
            key={i}
            style={{
              width: 40,
              background: `linear-gradient(to right, ${cellColor(s.rho)}, ${cellColor(
                stops[i + 1].rho,
              )})`,
            }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between" style={{ width: 160 }}>
        {stops.map((s) => (
          <span key={s.label}>{s.label}</span>
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  onPrime,
  priming,
  message,
}: {
  onPrime: () => void;
  priming: boolean;
  message: string | null;
}) {
  return (
    <div className="border border-dashed border-[var(--border)] rounded-sm p-8 text-center">
      <div className="font-mono text-[11px] tracking-[0.16em] text-[var(--fg-mute)] mb-2">
        NO PERSISTED HISTORY YET
      </div>
      <p className="text-[13px] text-[var(--fg-dim)] max-w-md mx-auto mb-4">
        The nightly backfill runs at 07:00 UTC to populate the PriceObservation
        table. You can also trigger it manually right now — it takes about
        20–30 seconds and pulls 25 markets × their historical 6h series into
        the database.
      </p>
      <button
        onClick={onPrime}
        disabled={priming}
        className="px-4 py-2 font-mono text-[11px] tracking-[0.16em] bg-[var(--accent-primary)] text-black hover:opacity-90 disabled:opacity-50"
      >
        {priming ? "BACKFILLING…" : "RUN BACKFILL NOW"}
      </button>
      {message && (
        <div className="mt-3 font-mono text-[10px] tracking-[0.12em] text-[var(--accent-primary)]">
          {message}
        </div>
      )}
    </div>
  );
}

function Msg({
  tone,
  children,
}: {
  tone: "dim" | "down";
  children: React.ReactNode;
}) {
  const color =
    tone === "down" ? "text-[var(--accent-down)]" : "text-[var(--fg-dim)]";
  return (
    <div
      className={`border border-[var(--border)] bg-black h-24 flex items-center justify-center text-[11px] font-mono tracking-wider ${color}`}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function formatRho(rho: number): string {
  if (!Number.isFinite(rho)) return "—";
  const sign = rho >= 0 ? "+" : "";
  return `${sign}${rho.toFixed(2)}`;
}

function rhoColor(rho: number): string {
  if (!Number.isFinite(rho)) return "var(--fg-mute)";
  if (rho >= 0.15) return "var(--accent-up)";
  if (rho <= -0.15) return "var(--accent-down)";
  return "var(--fg-dim)";
}

/** Green→dark→red divergent scale, intensity proportional to |ρ|. */
function cellColor(rho: number): string {
  if (!Number.isFinite(rho)) return "#111";
  const clamped = Math.max(-1, Math.min(1, rho));
  const intensity = Math.pow(Math.abs(clamped), 0.85); // slight gamma for punch
  if (clamped >= 0) {
    // Bloomberg-adjacent green: rgb(0,200,5) → dark
    return `rgba(0, 200, 5, ${(intensity * 0.85).toFixed(3)})`;
  }
  return `rgba(255, 59, 48, ${(intensity * 0.85).toFixed(3)})`;
}
