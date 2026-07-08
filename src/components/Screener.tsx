"use client";

import { useEffect, useMemo, useState } from "react";
import type { ScreenerRow, NewsItem, TradeEvent } from "@/lib/exchanges/types";
import { CATEGORIES, type Category } from "@/lib/categories";
import { fmtPct, fmtUsd, fmtRelativeDate } from "@/lib/format";
import { MarketDetailPanel } from "./MarketDetailPanel";

type SortKey = "volume" | "spread" | "closes" | "liquidity";

const FAVORITES_KEY = "predix.favorites.v1";
const SORT_KEY_KEY = "predix.sort.v1";
const CATEGORY_KEY = "predix.category.v1";

export function Screener({
  rows,
  news,
  trades,
}: {
  rows: ScreenerRow[];
  news: NewsItem[];
  trades: TradeEvent[];
}) {
  const [category, setCategory] = useState<Category>("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("volume");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const f = localStorage.getItem(FAVORITES_KEY);
      if (f) setFavorites(new Set(JSON.parse(f) as string[]));
      const s = localStorage.getItem(SORT_KEY_KEY) as SortKey | null;
      if (s) setSort(s);
      const c = localStorage.getItem(CATEGORY_KEY) as Category | null;
      if (c && CATEGORIES.includes(c)) setCategory(c);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
    } catch {
      /* ignore */
    }
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem(SORT_KEY_KEY, sort);
    } catch {
      /* ignore */
    }
  }, [sort]);

  useEffect(() => {
    try {
      localStorage.setItem(CATEGORY_KEY, category);
    } catch {
      /* ignore */
    }
  }, [category]);

  const filtered = useMemo(() => {
    let out = rows;
    if (category !== "All") out = out.filter((r) => r.bucket === category);
    if (showFavoritesOnly) out = out.filter((r) => favorites.has(r.id));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((r) => r.question.toLowerCase().includes(q));
    }

    // Within whatever sort the user picks, always pin the rows that have a
    // price on BOTH exchanges to the top — those are the only places a
    // cross-exchange spread/arb is meaningful — then the single-exchange rows
    // below. This is the ordering Max asked for.
    const hasBoth = (r: ScreenerRow) =>
      typeof r.polymarket?.yesPrice === "number" &&
      typeof r.kalshi?.yesPrice === "number";

    const byKey = (a: ScreenerRow, b: ScreenerRow): number => {
      if (sort === "volume") return (b.volume24h ?? 0) - (a.volume24h ?? 0);
      if (sort === "spread") return (b.spread ?? -1) - (a.spread ?? -1);
      if (sort === "liquidity") return (b.liquidity ?? 0) - (a.liquidity ?? 0);
      // closes
      const ax = a.closesAt?.getTime() ?? Number.POSITIVE_INFINITY;
      const bx = b.closesAt?.getTime() ?? Number.POSITIVE_INFINITY;
      return ax - bx;
    };

    const sorted = [...out];
    sorted.sort((a, b) => {
      const groupDiff = (hasBoth(b) ? 1 : 0) - (hasBoth(a) ? 1 : 0);
      if (groupDiff !== 0) return groupDiff;
      return byKey(a, b);
    });
    return sorted;
  }, [rows, category, search, sort, favorites, showFavoritesOnly]);

  const counts = useMemo(() => {
    const c: Record<Category, number> = {
      All: rows.length,
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
    for (const r of rows) c[r.bucket]++;
    return c;
  }, [rows]);

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selected = selectedId ? rows.find((r) => r.id === selectedId) : null;

  return (
    <div className="flex-1 flex flex-col">
      {/* Filter bar */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-2.5 bg-[var(--bg-elev)]">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search markets…"
          className="bg-[var(--bg)] border border-[var(--border)] px-3 py-1.5 text-xs w-56 rounded-sm focus:outline-none focus:border-[var(--accent-primary)] placeholder:text-[var(--fg-mute)]"
        />

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

        <div className="ml-auto flex items-center gap-3 text-xs">
          <button
            onClick={() => setShowFavoritesOnly((v) => !v)}
            className={`px-2.5 py-1 text-[11px] uppercase tracking-wider rounded-sm border ${
              showFavoritesOnly
                ? "bg-[var(--accent-amber)] text-black border-[var(--accent-amber)]"
                : "border-[var(--border)] text-[var(--fg-dim)] hover:text-[var(--accent-amber)]"
            }`}
          >
            ★ {favorites.size}
          </button>

          <label className="flex items-center gap-1.5 text-[var(--fg-dim)]">
            <span className="uppercase text-[10px] tracking-wider">Sort:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="bg-[var(--bg)] border border-[var(--border)] px-2 py-1 text-xs rounded-sm focus:outline-none focus:border-[var(--accent-primary)]"
            >
              <option value="volume">Volume 24h</option>
              <option value="spread">Spread</option>
              <option value="liquidity">Liquidity</option>
              <option value="closes">Closing soon</option>
            </select>
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-[13px]">
          <thead className="sticky top-0 bg-[var(--bg-elev)] border-b border-[var(--border)] z-10">
            <tr className="text-left text-[var(--fg-dim)] uppercase text-[10px] tracking-wider">
              <th className="pl-3 pr-1 py-2 w-7"></th>
              <th className="px-3 py-2">Market</th>
              <th className="px-3 py-2 text-right w-24">Polymarket</th>
              <th className="px-3 py-2 text-right w-24">Kalshi</th>
              <th className="px-3 py-2 text-right w-20">Spread</th>
              <th className="px-3 py-2 text-right w-24">Vol 24h</th>
              <th className="px-3 py-2 text-right w-24">Liquidity</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const fav = favorites.has(r.id);
              const isSelected = selectedId === r.id;
              return (
                <tr
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`border-b border-[var(--border-soft)] cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[#0d2027]"
                      : "hover:bg-[var(--bg-row)]"
                  }`}
                >
                  <td className="pl-3 pr-1 py-2.5 align-top">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(r.id);
                      }}
                      className={`text-sm leading-none ${
                        fav
                          ? "text-[var(--accent-amber)]"
                          : "text-[var(--fg-mute)] hover:text-[var(--accent-amber)]"
                      }`}
                      aria-label={fav ? "Unfavorite" : "Favorite"}
                    >
                      {fav ? "★" : "☆"}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 max-w-[520px]">
                    <div className="font-semibold text-[var(--fg)] truncate">
                      {r.question}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-[#0f1d22] text-[var(--accent-primary)] border border-[#173039] rounded-sm">
                        {r.bucket}
                      </span>
                      {r.closesAt && (
                        <span className="text-[10px] text-[var(--fg-dim)]">
                          {fmtRelativeDate(r.closesAt)} left
                        </span>
                      )}
                    </div>
                  </td>
                  <PriceCell price={r.polymarket?.yesPrice ?? null} />
                  <PriceCell price={r.kalshi?.yesPrice ?? null} />
                  <td
                    className={`px-3 py-2.5 text-right align-top font-semibold ${
                      r.spread === null
                        ? "text-[var(--fg-mute)]"
                        : r.spread > 0.05
                          ? "text-[var(--accent-amber)]"
                          : "text-[var(--fg)]"
                    }`}
                  >
                    {r.spread === null ? "—" : fmtPct(r.spread, 1)}
                  </td>
                  <td className="px-3 py-2.5 text-right align-top">
                    {fmtUsd(r.volume24h, { compact: true })}
                  </td>
                  <td className="px-3 py-2.5 text-right align-top text-[var(--fg-dim)]">
                    {fmtUsd(r.liquidity, { compact: true })}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-[var(--fg-dim)] text-xs"
                >
                  NO MATCHING MARKETS · CLEAR FILTERS OR ADJUST SEARCH
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail panel */}
      {selected && (
        <MarketDetailPanel
          row={selected}
          news={news.filter((n) => n.affectedMarketIds.includes(selected.id))}
          trades={trades
            .filter(
              (t) =>
                t.marketQuestion.toLowerCase() ===
                  selected.question.toLowerCase() ||
                selected.question.toLowerCase().includes(
                  t.marketQuestion.toLowerCase().slice(0, 30),
                ),
            )
            .slice(0, 20)}
          isFavorite={favorites.has(selected.id)}
          onClose={() => setSelectedId(null)}
          onToggleFavorite={() => toggleFavorite(selected.id)}
        />
      )}
    </div>
  );
}

function PriceCell({ price }: { price: number | null }) {
  if (price === null)
    return (
      <td className="px-3 py-2.5 text-right align-top text-[var(--fg-mute)]">
        —
      </td>
    );
  return (
    <td className="px-3 py-2.5 text-right align-top text-[var(--fg)] font-semibold">
      {fmtPct(price)}
    </td>
  );
}
