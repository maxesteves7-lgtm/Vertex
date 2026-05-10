"use client";

import { useMemo, useState, useEffect } from "react";
import type { TradeEvent } from "@/lib/exchanges/types";
import { fmtPct, fmtUsd } from "@/lib/format";

const MIN_SIZE_OPTIONS = [
  { label: "$500+", value: 500 },
  { label: "$1K+", value: 1_000 },
  { label: "$10K+", value: 10_000 },
  { label: "$50K+", value: 50_000 },
  { label: "$100K+", value: 100_000 },
];

const SIZE_FILTER_KEY = "predix.flow.minSize.v1";

export function OrderFlowTape({ trades }: { trades: TradeEvent[] }) {
  const [minSize, setMinSize] = useState<number>(1_000);
  const [side, setSide] = useState<"ALL" | "BUY" | "SELL">("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(SIZE_FILTER_KEY);
    if (saved) setMinSize(Number(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem(SIZE_FILTER_KEY, String(minSize));
  }, [minSize]);

  const filtered = useMemo(() => {
    let out = trades.filter((t) => t.sizeUsd >= minSize);
    if (side !== "ALL") out = out.filter((t) => t.side === side);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((t) => t.marketQuestion.toLowerCase().includes(q));
    }
    return out;
  }, [trades, minSize, side, search]);

  return (
    <div className="flex-1 flex flex-col">
      {/* Filter bar */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-2.5 bg-[var(--bg-elev)]">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by market…"
          className="bg-black border border-[var(--border)] px-3 py-1.5 text-xs w-56 rounded-sm focus:outline-none focus:border-[var(--accent-primary)] placeholder:text-[var(--fg-mute)]"
        />

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-[var(--fg-dim)] mr-1">
            Min size:
          </span>
          {MIN_SIZE_OPTIONS.map((opt) => {
            const active = minSize === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setMinSize(opt.value)}
                className={`px-2.5 py-1 text-[11px] uppercase tracking-wider rounded-sm border transition-colors ${
                  active
                    ? "bg-[var(--accent-primary)] text-black border-[var(--accent-primary)]"
                    : "bg-transparent text-[var(--fg-dim)] border-[var(--border)] hover:border-[var(--fg-dim)] hover:text-[var(--fg)]"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {(["ALL", "BUY", "SELL"] as const).map((s) => {
            const active = s === side;
            const colorClass =
              s === "BUY"
                ? "text-[var(--accent-buy)]"
                : s === "SELL"
                  ? "text-[var(--accent-sell)]"
                  : "text-[var(--fg-dim)]";
            return (
              <button
                key={s}
                onClick={() => setSide(s)}
                className={`px-2.5 py-1 text-[11px] uppercase tracking-wider rounded-sm border transition-colors ${
                  active
                    ? "border-[var(--fg-dim)] bg-[var(--bg-row)]"
                    : "border-[var(--border)] hover:border-[var(--fg-dim)]"
                } ${active ? colorClass : "text-[var(--fg-dim)]"}`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tape */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-[var(--bg-elev)] border-b border-[var(--border)] z-10">
            <tr className="text-left text-[var(--fg-dim)] uppercase text-[10px] tracking-wider">
              <th className="px-3 py-2 w-20">Time</th>
              <th className="px-3 py-2 w-24">Side</th>
              <th className="px-3 py-2">Market</th>
              <th className="px-3 py-2 text-right w-20">Price</th>
              <th className="px-3 py-2 text-right w-24">Size</th>
              <th className="px-3 py-2 text-right w-24">Exchange</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr
                key={t.id}
                className="border-b border-[var(--border-soft)] hover:bg-[var(--bg-row)]"
              >
                <td className="px-3 py-2 text-[var(--fg-dim)] text-[11px]">
                  {fmtRelativeTime(t.timestamp)}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold border rounded-sm ${
                      t.side === "BUY"
                        ? "text-[var(--accent-buy)] border-[#1d3a24] bg-[#0a1a0e]"
                        : "text-[var(--accent-sell)] border-[#3a1d1d] bg-[#1a0a0a]"
                    }`}
                  >
                    {t.side} {t.outcome}
                  </span>
                </td>
                <td className="px-3 py-2 max-w-[640px]">
                  <a
                    href={t.marketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--fg)] hover:text-[var(--accent-primary)] truncate inline-block max-w-full"
                    title={t.marketQuestion}
                  >
                    {t.marketQuestion}
                  </a>
                </td>
                <td className="px-3 py-2 text-right">{fmtPct(t.price)}</td>
                <td
                  className={`px-3 py-2 text-right font-semibold ${
                    t.sizeUsd >= 50_000
                      ? "text-[var(--accent-amber)]"
                      : "text-[var(--fg)]"
                  }`}
                >
                  {fmtUsd(t.sizeUsd, { compact: true })}
                </td>
                <td className="px-3 py-2 text-right text-[var(--accent-primary)]">
                  {t.exchange}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-[var(--fg-dim)] text-xs"
                >
                  NO TRADES MATCH FILTERS · LOWER MIN SIZE OR CLEAR SEARCH
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmtRelativeTime(d: Date): string {
  const diffSec = Math.round((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}s`;
  if (diffSec < 3600) return `${Math.round(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)}h`;
  return `${Math.round(diffSec / 86400)}d`;
}
