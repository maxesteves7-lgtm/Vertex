"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { ExchangeDownBanner } from "./Skeleton";

type SourceChip = "All" | "Polymarket" | "Kalshi";
type SortChip = "Most Volume" | "Closing Soon";

const PAGE_SIZE = 300;
const SEARCH_DEBOUNCE_MS = 250;

const FAV_KEY = "vertex.favorites.v1";
const SIDEBAR_KEY = "vertex.sidebar.v2";

export function HomeView({
  rows,
  news,
  trades,
  missing = [],
}: {
  rows: ScreenerRow[];
  news: NewsItem[];
  trades: TradeEvent[];
  missing?: Array<"Polymarket" | "Kalshi">;
}) {
  const params = useSearchParams();
  const urlQ = params.get("q") ?? "";

  const [selection, setSelection] = useState<SidebarSelection>({
    type: "view",
    view: "All",
  });
  const [sourceChip, setSourceChip] = useState<SourceChip>("All");
  const [sortChip, setSortChip] = useState<SortChip>("Most Volume");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightIdx, setHighlightIdx] = useState<number>(-1);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Debounce the URL search term so each keystroke doesn't re-filter 5k rows
  const [debouncedQ, setDebouncedQ] = useState(urlQ);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(urlQ), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [urlQ]);

  // Restore selection + favorites
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_KEY);
      if (raw) {
        const s = JSON.parse(raw) as SidebarSelection;
        if (s && (s.type === "view" || s.type === "category")) {
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

  // Reset paging + highlight on any filter change
  useEffect(() => {
    setVisible(PAGE_SIZE);
    setHighlightIdx(-1);
  }, [selection, sourceChip, sortChip, debouncedQ]);

  // Per-row source memo
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

  // Apply category + view + source chip + search + sort
  const filtered = useMemo(() => {
    const q = debouncedQ.trim().toLowerCase();
    let out = rowsWithSource;

    if (selection.type === "view") {
      if (selection.view === "Movers") {
        // Cross-exchange movers — both quotes present, sorted by spread desc
        out = out.filter(
          (x) =>
            typeof x.row.polymarket?.yesPrice === "number" &&
            typeof x.row.kalshi?.yesPrice === "number" &&
            x.row.spread !== null,
        );
      } else if (selection.view === "Closing") {
        // Within the next 48h
        const cutoff = Date.now() + 48 * 60 * 60 * 1000;
        out = out.filter(
          (x) =>
            x.row.closesAt !== null &&
            x.row.closesAt.getTime() <= cutoff,
        );
      } else if (selection.view === "Watchlist") {
        out = out.filter((x) => favorites.has(x.row.id));
      }
      // "All" — no view-level filter
    } else {
      // category type
      out = out.filter((x) => x.row.bucket === selection.bucket);
      if (selection.sub) {
        out = out.filter(
          (x) =>
            subBucketize(selection.bucket, x.row.question) === selection.sub,
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
    if (
      selection.type === "view" &&
      selection.view === "Movers"
    ) {
      sorted.sort((a, b) => (b.row.spread ?? 0) - (a.row.spread ?? 0));
    } else if (
      selection.type === "view" &&
      selection.view === "Closing"
    ) {
      sorted.sort((a, b) => {
        const ax = a.row.closesAt?.getTime() ?? Number.POSITIVE_INFINITY;
        const bx = b.row.closesAt?.getTime() ?? Number.POSITIVE_INFINITY;
        return ax - bx;
      });
    } else if (sortChip === "Most Volume") {
      sorted.sort(
        (a, b) => (b.row.volume24h ?? 0) - (a.row.volume24h ?? 0),
      );
    } else {
      sorted.sort((a, b) => {
        const ax = a.row.closesAt?.getTime() ?? Number.POSITIVE_INFINITY;
        const bx = b.row.closesAt?.getTime() ?? Number.POSITIVE_INFINITY;
        return ax - bx;
      });
    }
    return sorted;
  }, [
    rowsWithSource,
    selection,
    sourceChip,
    sortChip,
    debouncedQ,
    favorites,
  ]);

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

  // Keyboard shortcuts: j/k navigate, enter opens, / focuses search, ? help, esc closes
  const gridRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const isTyping =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (e.key === "Escape") {
        if (selectedId) setSelectedId(null);
        else if (showHelp) setShowHelp(false);
        else if (mobileSidebarOpen) setMobileSidebarOpen(false);
        return;
      }
      if (e.key === "?") {
        if (isTyping) return;
        e.preventDefault();
        setShowHelp((v) => !v);
        return;
      }
      if (e.key === "/") {
        if (isTyping) return;
        e.preventDefault();
        const input =
          document.querySelector<HTMLInputElement>("header input");
        input?.focus();
        input?.select();
        return;
      }
      if (isTyping) return;

      if (e.key === "j") {
        e.preventDefault();
        setHighlightIdx((i) => Math.min(filtered.length - 1, i + 1));
      } else if (e.key === "k") {
        e.preventDefault();
        setHighlightIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter" && highlightIdx >= 0) {
        const id = filtered[highlightIdx]?.row.id;
        if (id) setSelectedId(id);
      } else if (e.key === "f" && highlightIdx >= 0) {
        const id = filtered[highlightIdx]?.row.id;
        if (id) toggleFavorite(id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, highlightIdx, selectedId, showHelp, mobileSidebarOpen]);

  // Keep the highlighted card on-screen
  useEffect(() => {
    if (highlightIdx < 0) return;
    const node = gridRef.current?.querySelectorAll("[data-card]")[
      highlightIdx
    ] as HTMLElement | undefined;
    node?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    if (highlightIdx >= visible - 50 && visible < filtered.length) {
      setVisible((v) => v + PAGE_SIZE);
    }
  }, [highlightIdx, visible, filtered.length]);

  // Resolve the current heading
  let heading: string;
  if (selection.type === "view") {
    heading =
      selection.view === "All"
        ? "All Markets"
        : selection.view === "Movers"
          ? "Market Movers"
          : selection.view === "Closing"
            ? "Closing Soon"
            : "Watchlist";
  } else {
    heading = selection.sub ?? selection.bucket;
  }

  return (
    <main className="flex-1 flex relative">
      <Sidebar
        selection={selection}
        onSelect={setSelection}
        counts={counts}
        watchlistCount={favorites.size}
        open={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <section className="flex-1 min-w-0 px-4 md:px-6 py-5">
        <ExchangeDownBanner missing={missing} />
        {/* Heading */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 text-[var(--fg-dim)]"
              aria-label="Open sidebar"
            >
              ☰
            </button>
            <div>
              <h1 className="text-[20px] font-semibold text-white tracking-tight">
                {heading}
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
          <button
            onClick={() => setShowHelp(true)}
            className="hidden md:inline text-[11px] text-[var(--fg-mute)] hover:text-white border border-[var(--border)] rounded-full px-2.5 py-1"
            title="Keyboard shortcuts"
          >
            ? Shortcuts
          </button>
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
          <EmptyState selection={selection} />
        ) : (
          <>
            <div
              ref={gridRef}
              className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
            >
              {filtered.slice(0, visible).map((x, idx) => (
                <div
                  key={x.row.id}
                  data-card
                  className={
                    idx === highlightIdx
                      ? "ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--bg)] rounded-xl"
                      : ""
                  }
                >
                  <EventCard
                    row={x.row}
                    onClick={() => setSelectedId(x.row.id)}
                  />
                </div>
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

      {showHelp && (
        <ShortcutsModal onClose={() => setShowHelp(false)} />
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

function EmptyState({ selection }: { selection: SidebarSelection }) {
  let title = "No markets match these filters.";
  let hint = "Try clearing a chip or picking a different category.";
  if (selection.type === "view" && selection.view === "Watchlist") {
    title = "Your watchlist is empty.";
    hint = "Open any market and press the star to add it here.";
  } else if (selection.type === "view" && selection.view === "Closing") {
    title = "Nothing closes in the next 48 hours.";
    hint = "Check the All Markets view for upcoming resolutions.";
  } else if (selection.type === "view" && selection.view === "Movers") {
    title = "No cross-exchange movers right now.";
    hint =
      "Market Movers shows events listed on both Polymarket and Kalshi with the widest price spread.";
  }
  return (
    <div className="text-center text-[var(--fg-dim)] py-16 border border-dashed border-[var(--border)] rounded-xl">
      <div className="text-sm text-white">{title}</div>
      <div className="text-[12px] mt-1">{hint}</div>
    </div>
  );
}

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const rows: Array<[string, string]> = [
    ["/", "Focus search"],
    ["j / k", "Move highlight down / up"],
    ["Enter", "Open highlighted market"],
    ["f", "Toggle favorite on highlighted market"],
    ["Esc", "Close panel / modal / sidebar"],
    [":", "Open command bar"],
    ["?", "Show this menu"],
  ];
  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] max-w-[92vw] bg-[var(--bg-elev)] border border-[var(--border)] rounded-xl z-50 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">
            Keyboard shortcuts
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--fg-dim)] hover:text-white text-lg"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <table className="w-full text-[13px]">
          <tbody>
            {rows.map(([k, label]) => (
              <tr key={k} className="border-t border-[var(--border-soft)]">
                <td className="py-1.5 pr-3">
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-row)] border border-[var(--border)] text-[var(--fg-dim)] text-[12px] font-mono">
                    {k}
                  </kbd>
                </td>
                <td className="py-1.5 text-[var(--fg-dim)]">{label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
