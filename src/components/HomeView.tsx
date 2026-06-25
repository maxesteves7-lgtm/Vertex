"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  ScreenerRow,
  NewsItem,
  TradeEvent,
} from "@/lib/exchanges/types";
import {
  CATEGORY_TREE,
  subBucketize,
  type Category,
} from "@/lib/categories";
import { Sidebar, type SidebarSelection } from "./Sidebar";
import { EventCard, getSource } from "./EventCard";
import { MarketDetailPanel } from "./MarketDetailPanel";

type SourceChip = "All" | "Polymarket" | "Kalshi";
type SortChip = "Most Volume" | "Closing Soon";

const PAGE_SIZE = 300;

const FAV_KEY = "vertex.favorites.v1";
const SIDEBAR_KEY = "vertex.sidebar.v1";

export function HomeView({
  rows,
  news,
  trades,
}: {
  rows: ScreenerRow[];
  news: NewsItem[];
  trades: TradeEvent[];
}) {
  const params = useSearchParams();
  const urlQ = params.get("q") ?? "";

  const [selection, setSelection] = useState<SidebarSelection>({
    bucket: "All",
    sub: null,
  });
  const [sourceChip, setSourceChip] = useState<SourceChip>("All");
  const [sortChip, setSortChip] = useState<SortChip>("Most Volume");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Persist & restore sidebar selection
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_KEY);
      if (raw) {
        const s = JSON.parse(raw) as SidebarSelection;
        if (s && (s.bucket === "All" || CATEGORY_TREE.some((n) => n.bucket === s.bucket))) {
          setSelection(s);
        }
      }
      const f = localStorage.getItem(FAV_KEY);
      if (f) setFavorites(new Set(JSON.parse(f) as string[]));
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, JSON.stringify(selection));
    } catch {
      /* ignore */
    }
  }, [selection]);
  useEffect(() => {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify([...favorites]));
    } catch {
      /* ignore */
    }
  }, [favorites]);

  // Reset paging when any filter changes
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [selection, sourceChip, sortChip, urlQ]);

  // Per-row source memo so we don't recompute on every chip toggle
  const rowsWithSource = useMemo(
    () => rows.map((r) => ({ row: r, source: getSource(r) })),
    [rows],
  );

  // Top-level counts for sidebar badges
  const counts = useMemo(() => {
    const c: Record<string, number> = { All: rows.length };
    for (const node of CATEGORY_TREE) c[node.bucket] = 0;
    for (const r of rows) {
      const b = r.bucket as Category;
      c[b] = (c[b] ?? 0) + 1;
    }
    return c;
  }, [rows]);

  // Apply category, source chip, search, and sort
  const filtered = useMemo(() => {
    const q = urlQ.trim().toLowerCase();
    let out = rowsWithSource;

    if (selection.bucket !== "All") {
      out = out.filter((x) => x.row.bucket === selection.bucket);
      if (selection.sub) {
        out = out.filter(
          (x) =>
            subBucketize(selection.bucket as Category, x.row.question) ===
            selection.sub,
        );
      }
    }

    if (sourceChip !== "All") {
      out = out.filter((x) =>
        sourceChip === "Polymarket"
          ? x.source === "Polymarket" || x.source === "Both"
          : x.source === "Kalshi" || x.source === "Both",
      );
    }

    if (q) {
      out = out.filter((x) => x.row.question.toLowerCase().includes(q));
    }

    const sorted = [...out];
    if (sortChip === "Most Volume") {
      sorted.sort(
        (a, b) => (b.row.volume24h ?? 0) - (a.row.volume24h ?? 0),
      );
    } else {
      // Closing Soon — nulls last
      sorted.sort((a, b) => {
        const ax =
          a.row.closesAt?.getTime() ?? Number.POSITIVE_INFINITY;
        const bx =
          b.row.closesAt?.getTime() ?? Number.POSITIVE_INFINITY;
        return ax - bx;
      });
    }
    return sorted;
  }, [rowsWithSource, selection, sourceChip, sortChip, urlQ]);

  const totalVol = useMemo(
    () => filtered.reduce((a, x) => a + (x.row.volume24h ?? 0), 0),
    [filtered],
  );

  const selected =
    selectedId !== null
      ? (rows.find((r) => r.id === selectedId) ?? null)
      : null;

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <main className="flex-1 flex">
      <Sidebar
        selection={selection}
        onSelect={setSelection}
        counts={counts}
      />

      <section className="flex-1 min-w-0 px-6 py-5">
        {/* Heading */}
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <h1 className="text-[20px] font-semibold text-white tracking-tight">
              {selection.bucket === "All"
                ? "All Markets"
                : selection.sub ?? selection.bucket}
            </h1>
            <p className="text-[12px] text-[var(--fg-dim)] mt-0.5">
              {filtered.length.toLocaleString()} events ·{" "}
              <span className="text-white">
                ${(totalVol / 1_000_000).toFixed(1)}M
              </span>{" "}
              24h volume
            </p>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <Chip
            active={sourceChip === "All"}
            onClick={() => setSourceChip("All")}
          >
            All
          </Chip>
          <Chip
            active={sourceChip === "Kalshi"}
            onClick={() => setSourceChip("Kalshi")}
          >
            Kalshi
          </Chip>
          <Chip
            active={sourceChip === "Polymarket"}
            onClick={() => setSourceChip("Polymarket")}
          >
            Polymarket
          </Chip>
          <span className="mx-2 h-5 w-px bg-[var(--border)]" aria-hidden />
          <Chip
            active={sortChip === "Closing Soon"}
            onClick={() => setSortChip("Closing Soon")}
          >
            Closing Soon
          </Chip>
          <Chip
            active={sortChip === "Most Volume"}
            onClick={() => setSortChip("Most Volume")}
          >
            Most Volume
          </Chip>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center text-[var(--fg-dim)] text-sm py-16 border border-dashed border-[var(--border)] rounded-xl">
            No markets match these filters.
          </div>
        ) : (
          <>
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {filtered.slice(0, visible).map((x) => (
                <EventCard
                  key={x.row.id}
                  row={x.row}
                  onClick={() => setSelectedId(x.row.id)}
                />
              ))}
            </div>

            {visible < filtered.length && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  className="px-5 py-2 text-sm rounded-full bg-[var(--bg-elev)] border border-[var(--border)] text-white hover:bg-[var(--bg-hover)]"
                >
                  Load more · {filtered.length - visible} remaining
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {selected && (
        <MarketDetailPanel
          row={selected}
          news={news.filter((n) => n.affectedMarketIds.includes(selected.id))}
          trades={trades
            .filter(
              (t) =>
                t.marketQuestion.toLowerCase() ===
                  selected.question.toLowerCase() ||
                selected.question
                  .toLowerCase()
                  .includes(
                    t.marketQuestion.toLowerCase().slice(0, 30),
                  ),
            )
            .slice(0, 20)}
          isFavorite={favorites.has(selected.id)}
          onClose={() => setSelectedId(null)}
          onToggleFavorite={() => toggleFavorite(selected.id)}
        />
      )}
    </main>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
        active
          ? "bg-white text-black border-white"
          : "bg-[var(--bg-elev)] text-[var(--fg-dim)] border-[var(--border)] hover:text-white hover:border-[#3a3a3a]"
      }`}
    >
      {children}
    </button>
  );
}
