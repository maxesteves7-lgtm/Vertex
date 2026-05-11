"use client";

import { useMemo, useState } from "react";
import type { ScreenerRow, NewsItem, TradeEvent } from "@/lib/exchanges/types";
import { CATEGORIES, type Category } from "@/lib/categories";
import { fmtPct, fmtUsd } from "@/lib/format";
import { MarketDetailPanel } from "./MarketDetailPanel";

type Bucket = {
  key: string;
  label: string;
  /** Range start (inclusive) in ms — used to assign rows */
  start: number;
  /** Range end (exclusive) in ms */
  end: number;
};

function buildBuckets(now: Date): Bucket[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date(startOfTomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
  const inAWeek = new Date(startOfToday);
  inAWeek.setDate(inAWeek.getDate() + 7);
  const inTwoWeeks = new Date(startOfToday);
  inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);
  const inAMonth = new Date(startOfToday);
  inAMonth.setDate(inAMonth.getDate() + 30);
  const inThreeMonths = new Date(startOfToday);
  inThreeMonths.setDate(inThreeMonths.getDate() + 90);
  return [
    {
      key: "today",
      label: "Today",
      start: startOfToday.getTime(),
      end: startOfTomorrow.getTime(),
    },
    {
      key: "tomorrow",
      label: "Tomorrow",
      start: startOfTomorrow.getTime(),
      end: dayAfterTomorrow.getTime(),
    },
    {
      key: "this-week",
      label: "This week",
      start: dayAfterTomorrow.getTime(),
      end: inAWeek.getTime(),
    },
    {
      key: "next-week",
      label: "Next 1-2 weeks",
      start: inAWeek.getTime(),
      end: inTwoWeeks.getTime(),
    },
    {
      key: "this-month",
      label: "This month",
      start: inTwoWeeks.getTime(),
      end: inAMonth.getTime(),
    },
    {
      key: "this-quarter",
      label: "Next 1-3 months",
      start: inAMonth.getTime(),
      end: inThreeMonths.getTime(),
    },
    {
      key: "later",
      label: "Later",
      start: inThreeMonths.getTime(),
      end: Number.POSITIVE_INFINITY,
    },
  ];
}

export function CalendarView({
  rows,
  news,
  trades,
}: {
  rows: ScreenerRow[];
  news: NewsItem[];
  trades: TradeEvent[];
}) {
  const [category, setCategory] = useState<Category>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const filteredRows = rows
      .filter((r) => r.closesAt !== null)
      .filter((r) => category === "All" || r.bucket === category);

    const buckets = buildBuckets(new Date());
    const map = new Map<string, ScreenerRow[]>();
    for (const b of buckets) map.set(b.key, []);
    const undated: ScreenerRow[] = [];

    for (const r of filteredRows) {
      const t = r.closesAt!.getTime();
      const b = buckets.find((bb) => t >= bb.start && t < bb.end);
      if (b) map.get(b.key)!.push(r);
      else undated.push(r);
    }
    for (const arr of map.values()) {
      arr.sort(
        (a, b) =>
          (a.closesAt?.getTime() ?? 0) - (b.closesAt?.getTime() ?? 0),
      );
    }
    return { buckets, map };
  }, [rows, category]);

  const counts = useMemo(() => {
    const c: Record<Category, number> = {
      All: rows.filter((r) => r.closesAt).length,
      Politics: 0,
      Macro: 0,
      Crypto: 0,
      "AI/Tech": 0,
      Sports: 0,
      Weather: 0,
      Culture: 0,
      Health: 0,
      Other: 0,
    };
    for (const r of rows) if (r.closesAt) c[r.bucket]++;
    return c;
  }, [rows]);

  const selected = selectedId ? rows.find((r) => r.id === selectedId) : null;

  return (
    <div className="flex-1 flex flex-col">
      {/* Filter bar */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-2.5 bg-[var(--bg-elev)]">
        <div className="flex items-center gap-1.5 flex-wrap">
          {CATEGORIES.map((c) => {
            const active = c === category;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-2.5 py-1 text-[11px] uppercase tracking-wider rounded-sm border transition-colors ${
                  active
                    ? "bg-[var(--accent-primary)] text-black border-[var(--accent-primary)]"
                    : "bg-transparent text-[var(--fg-dim)] border-[var(--border)] hover:border-[var(--fg-dim)] hover:text-[var(--fg)]"
                }`}
              >
                {c} <span className="opacity-60">{counts[c]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bucket sections */}
      <div className="flex-1 overflow-auto">
        {grouped.buckets.map((b) => {
          const items = grouped.map.get(b.key) ?? [];
          if (items.length === 0) return null;
          return (
            <section key={b.key} className="border-b border-[var(--border)]">
              <div className="sticky top-0 bg-[var(--bg-elev)] border-b border-[var(--border)] px-4 py-1.5 flex items-center justify-between z-10">
                <div className="text-[10px] uppercase tracking-wider text-[var(--accent-primary)] font-semibold">
                  {b.label}
                  <span className="text-[var(--fg-dim)] ml-2">
                    {items.length} {items.length === 1 ? "market" : "markets"}
                  </span>
                </div>
              </div>
              <table className="w-full text-[12px]">
                <tbody>
                  {items.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      className="border-b border-[var(--border-soft)] cursor-pointer hover:bg-[var(--bg-row)]"
                    >
                      <td className="px-4 py-2 w-32 text-[var(--fg-dim)] text-[11px]">
                        {r.closesAt
                          ? r.closesAt.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-semibold truncate max-w-[640px]">
                          {r.question}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-[#0f1d22] text-[var(--accent-primary)] border border-[#173039] rounded-sm">
                            {r.bucket}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right w-20 text-[var(--accent-up)] font-semibold">
                        {fmtPct(r.polymarket?.yesPrice ?? null)}
                      </td>
                      <td className="px-3 py-2 text-right w-20 text-[var(--accent-down)] font-semibold">
                        {fmtPct(r.polymarket?.noPrice ?? null)}
                      </td>
                      <td className="px-3 py-2 text-right w-24">
                        {fmtUsd(r.volume24h, { compact: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>

      {selected && (
        <MarketDetailPanel
          row={selected}
          news={news.filter((n) => n.affectedMarketIds.includes(selected.id))}
          trades={trades
            .filter((t) =>
              selected.question
                .toLowerCase()
                .includes(t.marketQuestion.toLowerCase().slice(0, 30)),
            )
            .slice(0, 20)}
          isFavorite={false}
          onClose={() => setSelectedId(null)}
          onToggleFavorite={() => {}}
        />
      )}
    </div>
  );
}
