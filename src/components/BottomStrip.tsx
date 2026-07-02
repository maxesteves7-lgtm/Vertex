"use client";

import { useMemo, useState } from "react";
import type { ScreenerRow, NewsItem } from "@/lib/exchanges/types";
import { fmtUsd, fmtRelativeDate, fmtSmartTime } from "@/lib/format";

type Tab = "movers" | "closing" | "news";

/**
 * Bottom panel of the desktop cockpit. Tabbed compact lists over the
 * already-loaded screener data. Clicking a row pops that market into the
 * detail pane.
 */
export function BottomStrip({
  rows,
  news,
  onSelectRow,
}: {
  rows: ScreenerRow[];
  news: NewsItem[];
  onSelectRow: (id: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("movers");

  const movers = useMemo(() => {
    return rows
      .filter(
        (r) =>
          (r.polymarket?.priceChange24h ?? r.kalshi?.priceChange24h ?? null) !==
          null,
      )
      .map((r) => ({
        row: r,
        delta:
          r.polymarket?.priceChange24h ?? r.kalshi?.priceChange24h ?? 0,
      }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 40);
  }, [rows]);

  const closing = useMemo(() => {
    const cutoff = Date.now() + 48 * 60 * 60 * 1000;
    return rows
      .filter(
        (r) => r.closesAt !== null && r.closesAt.getTime() <= cutoff,
      )
      .sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))
      .slice(0, 40);
  }, [rows]);

  const recentNews = useMemo(
    () =>
      news
        .slice()
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 40),
    [news],
  );

  const tabs: Array<[Tab, string, number]> = [
    ["movers", "MOVERS", movers.length],
    ["closing", "CLOSING ≤48H", closing.length],
    ["news", "NEWS", recentNews.length],
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex items-center border-b border-[var(--border)] bg-[var(--bg-elev)] px-2">
        {tabs.map(([key, label, count]) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative font-mono text-[10px] tracking-[0.18em] px-3 py-2 transition-colors ${
                active
                  ? "text-[var(--accent-primary)]"
                  : "text-[var(--fg-dim)] hover:text-white"
              }`}
            >
              {label}{" "}
              <span className="text-[var(--fg-mute)]">{count}</span>
              {active && (
                <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[var(--accent-primary)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-auto">
        {tab === "movers" && (
          <MoversList rows={movers} onSelectRow={onSelectRow} />
        )}
        {tab === "closing" && (
          <ClosingList rows={closing} onSelectRow={onSelectRow} />
        )}
        {tab === "news" && <NewsList news={recentNews} />}
      </div>
    </div>
  );
}

function MoversList({
  rows,
  onSelectRow,
}: {
  rows: Array<{ row: ScreenerRow; delta: number }>;
  onSelectRow: (id: string) => void;
}) {
  if (rows.length === 0) {
    return <EmptyMsg>No price-change data available yet.</EmptyMsg>;
  }
  return (
    <table className="w-full text-[12px]">
      <thead className="bg-[var(--bg-elev)] sticky top-0 z-10">
        <tr className="text-left text-[var(--fg-mute)] font-mono text-[10px] tracking-[0.14em]">
          <th className="px-3 py-1.5 font-normal">EVENT</th>
          <th className="px-2 py-1.5 font-normal text-right w-20">Δ24H</th>
          <th className="px-2 py-1.5 font-normal text-right w-24">VOL 24H</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ row, delta }) => (
          <tr
            key={row.id}
            onClick={() => onSelectRow(row.id)}
            className="border-b border-[var(--border-soft)] cursor-pointer hover:bg-[var(--bg-row)]"
          >
            <td className="px-3 py-1.5 text-[var(--fg)] truncate max-w-[420px]">
              {row.question}
            </td>
            <td
              className={`px-2 py-1.5 text-right font-mono tabular-nums font-semibold ${
                delta >= 0
                  ? "text-[var(--accent-up)]"
                  : "text-[var(--accent-down)]"
              }`}
            >
              {delta >= 0 ? "+" : ""}
              {(delta * 100).toFixed(1)}pp
            </td>
            <td className="px-2 py-1.5 text-right font-mono tabular-nums text-[var(--fg-dim)]">
              {fmtUsd(row.volume24h, { compact: true })}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ClosingList({
  rows,
  onSelectRow,
}: {
  rows: ScreenerRow[];
  onSelectRow: (id: string) => void;
}) {
  if (rows.length === 0) {
    return <EmptyMsg>Nothing closes in the next 48 hours.</EmptyMsg>;
  }
  return (
    <table className="w-full text-[12px]">
      <thead className="bg-[var(--bg-elev)] sticky top-0 z-10">
        <tr className="text-left text-[var(--fg-mute)] font-mono text-[10px] tracking-[0.14em]">
          <th className="px-3 py-1.5 font-normal">EVENT</th>
          <th className="px-2 py-1.5 font-normal text-right w-20">CLOSES</th>
          <th className="px-2 py-1.5 font-normal text-right w-24">VOL 24H</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.id}
            onClick={() => onSelectRow(row.id)}
            className="border-b border-[var(--border-soft)] cursor-pointer hover:bg-[var(--bg-row)]"
          >
            <td className="px-3 py-1.5 text-[var(--fg)] truncate max-w-[420px]">
              {row.question}
            </td>
            <td className="px-2 py-1.5 text-right font-mono tabular-nums text-[var(--accent-primary)]">
              {row.closesAt ? fmtRelativeDate(row.closesAt) : "—"}
            </td>
            <td className="px-2 py-1.5 text-right font-mono tabular-nums text-[var(--fg-dim)]">
              {fmtUsd(row.volume24h, { compact: true })}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function NewsList({ news }: { news: NewsItem[] }) {
  if (news.length === 0) {
    return <EmptyMsg>No news loaded.</EmptyMsg>;
  }
  return (
    <ul className="divide-y divide-[var(--border-soft)]">
      {news.map((n) => (
        <li key={n.id} className="px-3 py-2 hover:bg-[var(--bg-row)]">
          <div className="flex items-baseline justify-between gap-2 font-mono text-[10px] tracking-wider text-[var(--fg-mute)]">
            <span className="text-[var(--accent-primary)] uppercase">
              {n.source}
            </span>
            <span>{fmtSmartTime(n.timestamp)}</span>
          </div>
          <a
            href={n.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-[13px] mt-0.5 text-[var(--fg)] hover:text-[var(--accent-primary)]"
          >
            {n.headline}
          </a>
        </li>
      ))}
    </ul>
  );
}

function EmptyMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-8 text-center text-[var(--fg-mute)] text-[12px]">
      {children}
    </div>
  );
}
