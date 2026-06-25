"use client";

import { useMemo, useState, useEffect } from "react";
import type { TradeEvent } from "@/lib/exchanges/types";
import { fmtPct, fmtUsd, fmtSmartTime } from "@/lib/format";

const MIN_SIZE_OPTIONS = [
  { label: "$500+", value: 500 },
  { label: "$1K+", value: 1_000 },
  { label: "$10K+", value: 10_000 },
  { label: "$50K+", value: 50_000 },
  { label: "$100K+", value: 100_000 },
];

const SIZE_FILTER_KEY = "vertex.flow.minSize.v1";

/** Trades at/above this size get the "whale" treatment in the tape. */
const WHALE_THRESHOLD = 25_000;

export function OrderFlowTape({ trades }: { trades: TradeEvent[] }) {
  const [minSize, setMinSize] = useState<number>(500);
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

  // Quick rollups for the header strip
  const stats = useMemo(() => {
    const whales = filtered.filter((t) => t.sizeUsd >= WHALE_THRESHOLD);
    const totalNotional = filtered.reduce((a, t) => a + t.sizeUsd, 0);
    const buys = filtered.filter((t) => t.side === "BUY");
    const sells = filtered.filter((t) => t.side === "SELL");
    return {
      whales: whales.length,
      whaleNotional: whales.reduce((a, t) => a + t.sizeUsd, 0),
      totalNotional,
      buyShare:
        filtered.length === 0
          ? 0
          : buys.reduce((a, t) => a + t.sizeUsd, 0) / totalNotional,
      buyCount: buys.length,
      sellCount: sells.length,
    };
  }, [filtered]);

  return (
    <div className="flex-1 flex flex-col px-6 py-5">
      {/* Header summary */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[20px] font-semibold text-white tracking-tight">
            Order Flow
          </h1>
          <p className="text-[12px] text-[var(--fg-dim)] mt-0.5">
            Live large-trade tape from Polymarket — buy/sell pressure, whale
            activity, market-by-market.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <StatPill
            label="Trades"
            value={filtered.length.toLocaleString()}
            accent="white"
          />
          <StatPill
            label="Notional"
            value={fmtUsd(stats.totalNotional, { compact: true })}
            accent="white"
          />
          <StatPill
            label="🐋 Whales (≥$25K)"
            value={stats.whales.toLocaleString()}
            accent="amber"
          />
          <StatPill
            label="Buy share"
            value={`${(stats.buyShare * 100).toFixed(0)}%`}
            accent={stats.buyShare >= 0.5 ? "up" : "down"}
          />
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-mute)]">
            ⌕
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by market…"
            className="bg-[var(--bg-elev)] border border-transparent focus:border-[var(--border)] rounded-full pl-9 pr-4 py-1.5 text-[13px] w-64 outline-none text-white placeholder:text-[var(--fg-mute)]"
          />
        </div>

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
                className={`px-3 py-1 text-[11px] rounded-full transition-colors ${
                  active
                    ? "bg-white text-black"
                    : "bg-[var(--bg-elev)] text-[var(--fg-dim)] hover:text-white"
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
            const accent =
              s === "BUY"
                ? "text-[var(--accent-up)]"
                : s === "SELL"
                  ? "text-[var(--accent-down)]"
                  : "text-white";
            return (
              <button
                key={s}
                onClick={() => setSide(s)}
                className={`px-3 py-1 text-[11px] rounded-full transition-colors ${
                  active
                    ? `bg-[var(--bg-row)] ${accent}`
                    : `bg-[var(--bg-elev)] text-[var(--fg-dim)] hover:text-white`
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tape */}
      <div className="flex-1 overflow-auto border border-[var(--border-soft)] rounded-xl bg-[var(--bg-elev)]">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-[var(--bg-elev)] border-b border-[var(--border)] z-10">
            <tr className="text-left text-[var(--fg-dim)] uppercase text-[10px] tracking-wider">
              <th className="px-4 py-2.5 w-32">Time</th>
              <th className="px-3 py-2.5 w-28">Side</th>
              <th className="px-3 py-2.5">Market</th>
              <th className="px-3 py-2.5 text-right w-20">Price</th>
              <th className="px-3 py-2.5 text-right w-28">Size</th>
              <th className="px-3 py-2.5 text-right w-24">Exchange</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const isWhale = t.sizeUsd >= WHALE_THRESHOLD;
              return (
                <tr
                  key={t.id}
                  className={`border-b border-[var(--border-soft)] transition-colors hover:bg-[var(--bg-row)] ${
                    isWhale
                      ? "bg-[rgba(245,158,11,0.07)]"
                      : ""
                  }`}
                >
                  <td className="px-4 py-2 text-[var(--fg-dim)] text-[11px] whitespace-nowrap">
                    {fmtSmartTime(t.timestamp)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-full ${
                        t.side === "BUY"
                          ? "text-[var(--accent-up)] bg-[rgba(0,200,5,0.12)]"
                          : "text-[var(--accent-down)] bg-[rgba(255,80,0,0.12)]"
                      }`}
                    >
                      {t.side} {t.outcome}
                    </span>
                  </td>
                  <td className="px-3 py-2 max-w-[640px]">
                    <div className="flex items-center gap-2">
                      {isWhale && (
                        <span
                          aria-label="Whale trade"
                          title="Whale trade ≥ $25,000"
                          className="text-[12px]"
                        >
                          🐋
                        </span>
                      )}
                      <a
                        href={t.marketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`truncate inline-block max-w-full hover:text-[var(--accent-primary)] ${
                          isWhale ? "text-white font-semibold" : "text-[var(--fg)]"
                        }`}
                        title={t.marketQuestion}
                      >
                        {t.marketQuestion}
                      </a>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {fmtPct(t.price)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-semibold tabular-nums ${
                      isWhale ? "text-[var(--accent-amber)]" : "text-white"
                    }`}
                  >
                    {fmtUsd(t.sizeUsd, { compact: true })}
                    {isWhale && (
                      <SizeBar
                        value={t.sizeUsd}
                        max={Math.max(WHALE_THRESHOLD * 4, t.sizeUsd)}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--accent-primary)]">
                    {t.exchange}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-16 text-center text-[var(--fg-dim)] text-sm"
                >
                  No trades match these filters. Try lowering the min size or
                  clearing the search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "white" | "amber" | "up" | "down";
}) {
  const color =
    accent === "amber"
      ? "text-[var(--accent-amber)]"
      : accent === "up"
        ? "text-[var(--accent-up)]"
        : accent === "down"
          ? "text-[var(--accent-down)]"
          : "text-white";
  return (
    <div className="px-3 py-1.5 rounded-full bg-[var(--bg-elev)] border border-[var(--border-soft)] flex items-center gap-2">
      <span className="text-[var(--fg-dim)] uppercase text-[10px] tracking-wider">
        {label}
      </span>
      <span className={`font-semibold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

function SizeBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.max(2, (value / max) * 100));
  return (
    <div className="mt-1 h-[3px] bg-[var(--border-soft)] rounded-full overflow-hidden ml-auto w-20">
      <div
        className="h-full bg-[var(--accent-amber)]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// fmtRelativeTime removed — now using fmtSmartTime from lib/format
