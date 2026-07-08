"use client";

import { useMemo, useState } from "react";
import type { ScreenerRow } from "@/lib/exchanges/types";
import { fmtPct, fmtUsd, fmtRelativeDate } from "@/lib/format";
import { getSource } from "./EventCard";

type SortKey =
  | "question"
  | "source"
  | "bucket"
  | "yes"
  | "no"
  | "vol24h"
  | "closes"
  | "delta24h";
type SortDir = "asc" | "desc";

/**
 * Dense Bloomberg-style scanner. Optimized for information density:
 * tabular numbers, tight rows, right-aligned data, monospace numerics.
 * Sortable headers, click row to open detail panel.
 */
export function Scanner({
  rows,
  onSelectRow,
  selectedId,
  highlightIdx,
  onContextMenuRow,
}: {
  rows: ScreenerRow[];
  onSelectRow: (id: string) => void;
  selectedId: string | null;
  /** Optional external highlight (e.g. j/k keyboard nav). */
  highlightIdx?: number;
  /** Right-click on a row → parent decides what to do. */
  onContextMenuRow?: (row: ScreenerRow, e: React.MouseEvent) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("vol24h");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "question" || key === "bucket" ? "asc" : "desc");
    }
  }

  const sorted = useMemo(() => {
    const arr = rows.slice();
    arr.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const compare = (av: unknown, bv: unknown) => {
        if (av === bv) return 0;
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        if (typeof av === "number" && typeof bv === "number") {
          return (av - bv) * dir;
        }
        return String(av).localeCompare(String(bv)) * dir;
      };

      switch (sortKey) {
        case "question":
          return compare(a.question.toLowerCase(), b.question.toLowerCase());
        case "source":
          return compare(getSource(a), getSource(b));
        case "bucket":
          return compare(a.bucket, b.bucket);
        case "yes":
          return compare(
            a.polymarket?.yesPrice ?? a.kalshi?.yesPrice ?? null,
            b.polymarket?.yesPrice ?? b.kalshi?.yesPrice ?? null,
          );
        case "no":
          return compare(
            a.polymarket?.noPrice ?? a.kalshi?.noPrice ?? null,
            b.polymarket?.noPrice ?? b.kalshi?.noPrice ?? null,
          );
        case "vol24h":
          return compare(a.volume24h, b.volume24h);
        case "closes":
          return compare(
            a.closesAt?.getTime() ?? null,
            b.closesAt?.getTime() ?? null,
          );
        case "delta24h":
          return compare(deltaOf(a), deltaOf(b));
      }
    });
    return arr;
  }, [rows, sortKey, sortDir]);

  return (
    <div className="border border-[var(--border)] bg-[var(--bg-elev)] overflow-hidden rounded-sm">
      <div className="max-h-[calc(100vh-260px)] overflow-auto">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-[var(--bg-elev)] border-b border-[var(--border)] z-10">
            <tr className="text-left text-[var(--fg-mute)] font-mono text-[10px] tracking-[0.14em]">
              <Th label="EVENT" sortKey="question" active={sortKey} dir={sortDir} onClick={toggleSort} />
              <Th label="SRC" sortKey="source" active={sortKey} dir={sortDir} onClick={toggleSort} width="w-20" />
              <Th label="CAT" sortKey="bucket" active={sortKey} dir={sortDir} onClick={toggleSort} width="w-24" />
              <Th label="YES" sortKey="yes" active={sortKey} dir={sortDir} onClick={toggleSort} align="right" width="w-16" />
              <Th label="NO" sortKey="no" active={sortKey} dir={sortDir} onClick={toggleSort} align="right" width="w-16" />
              <Th label="Δ24H" sortKey="delta24h" active={sortKey} dir={sortDir} onClick={toggleSort} align="right" width="w-20" />
              <Th label="VOL 24H" sortKey="vol24h" active={sortKey} dir={sortDir} onClick={toggleSort} align="right" width="w-24" />
              <Th label="CLOSES" sortKey="closes" active={sortKey} dir={sortDir} onClick={toggleSort} align="right" width="w-24" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, idx) => {
              const yes = r.polymarket?.yesPrice ?? r.kalshi?.yesPrice ?? null;
              const no = r.polymarket?.noPrice ?? r.kalshi?.noPrice ?? null;
              const delta = deltaOf(r);
              const source = getSource(r);
              const isSelected = r.id === selectedId;
              const isFocused = idx === highlightIdx;
              return (
                <tr
                  key={r.id}
                  data-row
                  onClick={() => onSelectRow(r.id)}
                  onContextMenu={(e) => onContextMenuRow?.(r, e)}
                  className={`border-b border-[var(--border-soft)] cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[rgba(255,102,0,0.06)]"
                      : "hover:bg-[var(--bg-row)]"
                  } ${isFocused ? "row-focused" : ""}`}
                >
                  <td className="px-3 py-1.5 max-w-[480px]">
                    <span className="truncate inline-block max-w-full text-[var(--fg)]">
                      {r.question}
                    </span>
                  </td>
                  <td className="px-2 py-1.5">
                    <SourceTag source={source} />
                  </td>
                  <td className="px-2 py-1.5 text-[var(--fg-dim)] uppercase text-[10px] tracking-wider">
                    {r.bucket}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums text-[var(--accent-up)] font-semibold">
                    {fmtPct(yes, 0)}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums text-[var(--accent-down)] font-semibold">
                    {fmtPct(no, 0)}
                  </td>
                  <td
                    className={`px-2 py-1.5 text-right font-mono tabular-nums ${
                      delta === null
                        ? "text-[var(--fg-mute)]"
                        : delta >= 0
                          ? "text-[var(--accent-up)]"
                          : "text-[var(--accent-down)]"
                    }`}
                  >
                    {fmtDelta(delta)}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums text-[var(--fg)]">
                    {fmtUsd(r.volume24h, { compact: true })}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums text-[var(--fg-dim)]">
                    {r.closesAt ? fmtRelativeDate(r.closesAt) : "—"}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-[var(--fg-dim)] text-xs"
                >
                  NO EVENTS MATCH FILTERS
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function deltaOf(r: ScreenerRow): number | null {
  return (
    r.polymarket?.priceChange24h ??
    r.kalshi?.priceChange24h ??
    null
  );
}

function fmtDelta(d: number | null): string {
  if (d === null || !Number.isFinite(d)) return "—";
  const pp = d * 100;
  const sign = pp >= 0 ? "+" : "";
  return `${sign}${pp.toFixed(1)}pp`;
}

function Th({
  label,
  sortKey,
  active,
  dir,
  onClick,
  align = "left",
  width = "",
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: SortDir;
  onClick: (k: SortKey) => void;
  align?: "left" | "right";
  width?: string;
}) {
  const isActive = active === sortKey;
  return (
    <th
      onClick={() => onClick(sortKey)}
      className={`px-2 py-2 select-none cursor-pointer ${width} ${
        align === "right" ? "text-right" : "text-left"
      } ${isActive ? "text-[var(--accent-primary)]" : "hover:text-[var(--fg)]"}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className="text-[8px] opacity-70">
          {isActive ? (dir === "asc" ? "▲" : "▼") : ""}
        </span>
      </span>
    </th>
  );
}

function SourceTag({
  source,
}: {
  source: "Polymarket" | "Kalshi" | "Both";
}) {
  const map = {
    Polymarket: {
      color: "var(--src-polymarket)",
      bg: "rgba(110, 86, 207, 0.12)",
      label: "POLY",
    },
    Kalshi: {
      color: "var(--src-kalshi)",
      bg: "rgba(20, 184, 166, 0.12)",
      label: "KAL",
    },
    Both: {
      color: "var(--accent-primary)",
      bg: "rgba(255, 102, 0, 0.12)",
      label: "BOTH",
    },
  } as const;
  const s = map[source];
  return (
    <span
      className="px-1.5 py-0.5 rounded-sm font-mono text-[10px] tracking-wider"
      style={{ color: s.color, background: s.bg }}
    >
      {s.label}
    </span>
  );
}
