"use client";

import { useEffect, useMemo, useState } from "react";

export type Candidate = {
  /** Polymarket YES token ID */
  tokenId: string;
  /** ScreenerRow id — used to open the market in the detail pane */
  rowId: string;
  question: string;
};

type Window = "24h" | "7d" | "30d";
type CorrelationRow = { tokenId: string; rho: number; n: number };

/**
 * Correlated Markets panel. Shows the top positively and top negatively
 * correlated markets against the currently selected market, computed on
 * demand from Polymarket CLOB price history (last 7d hourly by default).
 *
 * Empty states are honest — if there aren't enough overlapping observations
 * for any candidate, we say so instead of publishing junk coefficients.
 */
export function CorrelatedMarkets({
  seedTokenId,
  candidates,
  onSelectRow,
}: {
  seedTokenId: string | null;
  candidates: Candidate[];
  onSelectRow: (rowId: string) => void;
}) {
  const [window, setWindow] = useState<Window>("7d");
  const [rows, setRows] = useState<CorrelationRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!seedTokenId) {
      setRows(null);
      return;
    }
    const uniqueCandidates = Array.from(
      new Set(candidates.map((c) => c.tokenId)),
    ).filter((t) => t !== seedTokenId);
    if (uniqueCandidates.length === 0) {
      setRows([]);
      return;
    }

    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    fetch("/api/correlations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        seed: seedTokenId,
        candidates: uniqueCandidates.slice(0, 40),
        window,
      }),
      signal: ctrl.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`feed returned ${res.status}`);
        return (await res.json()) as {
          correlations: CorrelationRow[];
        };
      })
      .then((data) => {
        setRows(data.correlations ?? []);
      })
      .catch((e) => {
        if ((e as Error).name === "AbortError") return;
        setError(e instanceof Error ? e.message : "correlations error");
        setRows([]);
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [seedTokenId, candidates, window]);

  // Look-ups by tokenId → question + rowId so we can render nice rows
  const meta = useMemo(() => {
    const m = new Map<string, Candidate>();
    for (const c of candidates) m.set(c.tokenId, c);
    return m;
  }, [candidates]);

  const positives = useMemo(
    () => (rows ? rows.filter((r) => r.rho > 0).slice(0, 8) : []),
    [rows],
  );
  const negatives = useMemo(
    () =>
      rows
        ? rows.filter((r) => r.rho < 0).sort((a, b) => a.rho - b.rho).slice(0, 5)
        : [],
    [rows],
  );

  if (!seedTokenId) {
    return (
      <div className="border border-[var(--border)] bg-[var(--bg)] h-24 flex items-center justify-center text-[var(--fg-mute)] text-[11px] font-mono tracking-wider">
        NO POLYMARKET TOKEN — CORRELATIONS UNAVAILABLE
      </div>
    );
  }

  return (
    <div>
      {/* Window selector */}
      <div className="flex items-center gap-2 mb-2 font-mono text-[10px] tracking-[0.12em]">
        <div className="flex items-center border border-[var(--border)] rounded-sm overflow-hidden">
          {(["24h", "7d", "30d"] as Window[]).map((w) => (
            <button
              key={w}
              onClick={() => setWindow(w)}
              className={`px-2 py-0.5 transition-colors ${
                window === w
                  ? "bg-[var(--accent-primary)] text-black"
                  : "text-[var(--fg-dim)] hover:text-[var(--fg)] border-l border-[var(--border)] first:border-l-0"
              }`}
            >
              {w.toUpperCase()}
            </button>
          ))}
        </div>
        <span className="text-[var(--fg-mute)]">
          HOURLY, PEARSON ρ · N≥20 REQUIRED
        </span>
        {loading && <span className="live-dot ml-auto" />}
      </div>

      {error && !rows ? (
        <Msg tone="down">FEED ERROR · {error}</Msg>
      ) : loading && !rows ? (
        <Msg tone="dim">LOADING…</Msg>
      ) : !rows || rows.length === 0 ? (
        <Msg tone="mute">
          NOT ENOUGH OVERLAPPING HISTORY FOR ANY PEER
        </Msg>
      ) : (
        <div className="space-y-3">
          <Table
            label="POSITIVELY CORRELATED"
            rows={positives}
            meta={meta}
            onSelectRow={onSelectRow}
          />
          <Table
            label="NEGATIVELY CORRELATED"
            rows={negatives}
            meta={meta}
            onSelectRow={onSelectRow}
          />
        </div>
      )}
    </div>
  );
}

function Table({
  label,
  rows,
  meta,
  onSelectRow,
}: {
  label: string;
  rows: CorrelationRow[];
  meta: Map<string, Candidate>;
  onSelectRow: (rowId: string) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="border border-[var(--border)] bg-[var(--bg)]">
      <div className="px-2 py-1 border-b border-[var(--border)] bg-[var(--bg-elev)] font-mono text-[9px] tracking-[0.16em] text-[var(--fg-mute)] flex items-center justify-between">
        <span>{label}</span>
        <span>ρ · N</span>
      </div>
      <ul className="divide-y divide-[var(--border-soft)]">
        {rows.map((r, i) => {
          const m = meta.get(r.tokenId);
          if (!m) return null;
          const color =
            r.rho > 0 ? "text-[var(--accent-up)]" : "text-[var(--accent-down)]";
          const bar = Math.min(100, Math.abs(r.rho) * 100);
          return (
            <li
              key={r.tokenId}
              onClick={() => onSelectRow(m.rowId)}
              className="relative px-2 py-1.5 cursor-pointer hover:bg-[var(--bg-row)] flex items-center gap-2"
            >
              <span
                aria-hidden
                className={`absolute inset-y-0 ${r.rho > 0 ? "left-0" : "right-0"} ${
                  r.rho > 0
                    ? "bg-[var(--accent-up)]"
                    : "bg-[var(--accent-down)]"
                } opacity-[0.06]`}
                style={{ width: `${bar}%` }}
              />
              <span className="relative w-5 font-mono text-[10px] text-[var(--fg-mute)] tabular-nums">
                {i + 1}
              </span>
              <span className="relative flex-1 truncate text-[12px] text-[var(--fg)]">
                {m.question}
              </span>
              <span
                className={`relative font-mono text-[11px] font-semibold tabular-nums ${color}`}
              >
                {r.rho >= 0 ? "+" : ""}
                {r.rho.toFixed(2)}
              </span>
              <span className="relative font-mono text-[10px] text-[var(--fg-mute)] tabular-nums w-8 text-right">
                {r.n}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Msg({
  tone,
  children,
}: {
  tone: "dim" | "mute" | "down";
  children: React.ReactNode;
}) {
  const color =
    tone === "down"
      ? "text-[var(--accent-down)]"
      : tone === "mute"
        ? "text-[var(--fg-mute)]"
        : "text-[var(--fg-dim)]";
  return (
    <div
      className={`border border-[var(--border)] bg-[var(--bg)] h-16 flex items-center justify-center text-[11px] font-mono tracking-wider ${color}`}
    >
      {children}
    </div>
  );
}
