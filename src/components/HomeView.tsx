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
import { Scanner } from "./Scanner";
import { DesktopCockpit } from "./DesktopCockpit";
import { DetailPane } from "./DetailPane";
import { BottomStrip } from "./BottomStrip";
import { ScreenerBuilder } from "./ScreenerBuilder";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import { OnboardingTour } from "./OnboardingTour";
import { hasSeenTour } from "@/lib/onboarding";
import { exportRowsToCsv } from "@/lib/csv";
import {
  deleteScreener,
  loadScreeners,
  saveScreeners,
  upsertScreener,
  type SavedScreener,
} from "@/lib/screeners";

type SourceChip = "All" | "Polymarket" | "Kalshi";
type SortChip = "Most Volume" | "Closing Soon";
type ViewMode = "scanner" | "cards";

const PAGE_SIZE = 300;
const SEARCH_DEBOUNCE_MS = 250;

const FAV_KEY = "vertex.favorites.v1";
const SIDEBAR_KEY = "vertex.sidebar.v2";
const VIEW_MODE_KEY = "vertex.viewMode.v1";

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
  const [viewMode, setViewMode] = useState<ViewMode>("scanner");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightIdx, setHighlightIdx] = useState<number>(-1);
  /** Ordered list of favorited row IDs. Order matters — the Watchlist view
   *  and drag-to-reorder both rely on it. Persisted as an array in
   *  localStorage. Wrap in a Set via `favoritesSet` for O(1) has-checks. */
  const [favorites, setFavorites] = useState<string[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [screeners, setScreeners] = useState<SavedScreener[]>([]);
  const [builderTarget, setBuilderTarget] = useState<SavedScreener | null>(
    null,
  );
  const [builderOpen, setBuilderOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    rowId: string;
  } | null>(null);
  const [tourOpen, setTourOpen] = useState(false);

  // First-run: auto-open the terminal primer if the user hasn't dismissed it
  useEffect(() => {
    if (!hasSeenTour()) setTourOpen(true);
  }, []);

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
      if (f) setFavorites(JSON.parse(f) as string[]);
      const v = localStorage.getItem(VIEW_MODE_KEY) as ViewMode | null;
      if (v === "scanner" || v === "cards") setViewMode(v);
      setScreeners(loadScreeners());
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch {
      /* ignore */
    }
  }, [viewMode]);
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, JSON.stringify(selection));
    } catch {
      /* ignore */
    }
  }, [selection]);
  useEffect(() => {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
    } catch {
      /* ignore */
    }
  }, [favorites]);

  /** Memoized Set for O(1) `has()` checks in filter + everywhere else. */
  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);

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
        // Preserve favorites-array order (the user's chosen watchlist order).
        const bySource = new Map(rowsWithSource.map((x) => [x.row.id, x]));
        out = favorites
          .map((id) => bySource.get(id))
          .filter((x): x is (typeof rowsWithSource)[number] => Boolean(x));
      }
      // "All" — no view-level filter
    } else if (selection.type === "category") {
      out = out.filter((x) => x.row.bucket === selection.bucket);
      if (selection.sub) {
        out = out.filter(
          (x) =>
            subBucketize(selection.bucket, x.row.question) === selection.sub,
        );
      }
    } else {
      // "screener" — apply the saved preset's filter
      const preset = screeners.find((s) => s.id === selection.id);
      if (preset) {
        const f = preset.filter;
        if (f.sources.length > 0) {
          out = out.filter((x) => f.sources.includes(x.source));
        }
        if (f.categories.length > 0) {
          out = out.filter((x) => f.categories.includes(x.row.bucket));
        }
        if (f.minVolume24h && f.minVolume24h > 0) {
          out = out.filter(
            (x) => (x.row.volume24h ?? 0) >= (f.minVolume24h as number),
          );
        }
        if (f.maxDaysToClose !== undefined) {
          const cutoff =
            Date.now() + f.maxDaysToClose * 24 * 60 * 60 * 1000;
          out = out.filter(
            (x) =>
              x.row.closesAt !== null &&
              x.row.closesAt.getTime() <= cutoff,
          );
        }
        if (f.yesMin !== undefined || f.yesMax !== undefined) {
          const lo = f.yesMin ?? 0;
          const hi = f.yesMax ?? 1;
          out = out.filter((x) => {
            const yes =
              x.row.polymarket?.yesPrice ?? x.row.kalshi?.yesPrice ?? null;
            if (yes === null) return false;
            return yes >= lo && yes <= hi;
          });
        }
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
    screeners,
  ]);

  const totalVol = useMemo(
    () => filtered.reduce((a, x) => a + (x.row.volume24h ?? 0), 0),
    [filtered],
  );

  const selected =
    selectedId !== null
      ? (rows.find((r) => r.id === selectedId) ?? null)
      : null;

  // Page title reflects the selected market — terminal-style
  useEffect(() => {
    const base = "Futurist // Prediction Market Terminal";
    if (selected) {
      const short =
        selected.question.length > 60
          ? selected.question.slice(0, 57) + "…"
          : selected.question;
      document.title = `${short} | Futurist`;
    } else {
      document.title = base;
    }
    return () => {
      document.title = base;
    };
  }, [selected]);

  function toggleFavorite(id: string) {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  /** Open the row-level context menu at a click position. */
  function openContextMenu(row: ScreenerRow, e: React.MouseEvent) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, rowId: row.id });
  }

  /** Move `fromId` to the position currently occupied by `toId`. Called by
   *  the Watchlist drag-drop handlers. */
  function reorderFavorites(fromId: string, toId: string) {
    setFavorites((prev) => {
      const fromIdx = prev.indexOf(fromId);
      const toIdx = prev.indexOf(toId);
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return prev;
      const next = prev.slice();
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
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
      } else if (e.key === "1") {
        e.preventDefault();
        setViewMode("scanner");
      } else if (e.key === "2") {
        e.preventDefault();
        setViewMode("cards");
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
  } else if (selection.type === "category") {
    heading = selection.sub ?? selection.bucket;
  } else {
    heading =
      screeners.find((s) => s.id === selection.id)?.name ?? "Screener";
  }

  // Trades and news relevant to the currently-selected market — derived
  // once here so both the desktop inline pane and the mobile overlay can
  // share the computation.
  const selectedNews = selected
    ? news.filter((n) => n.affectedMarketIds.includes(selected.id))
    : [];
  const selectedTrades = selected
    ? trades
        .filter(
          (t) =>
            t.marketQuestion.toLowerCase() ===
              selected.question.toLowerCase() ||
            selected.question
              .toLowerCase()
              .includes(t.marketQuestion.toLowerCase().slice(0, 30)),
        )
        .slice(0, 20)
    : [];

  // Candidate peers for correlation — Polymarket-backed rows in the same
  // bucket as the seed, sorted by 24h volume so we score the most liquid
  // peers first. Capped at 30 so the API stays comfortably under Vercel's
  // 10-second function budget with concurrency 6.
  const correlationCandidates = useMemo(() => {
    if (!selected) return [];
    return rows
      .filter(
        (r) =>
          r.id !== selected.id &&
          r.bucket === selected.bucket &&
          !!r.polymarketYesTokenId,
      )
      .sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))
      .slice(0, 30)
      .map((r) => ({
        tokenId: r.polymarketYesTokenId as string,
        rowId: r.id,
        question: r.question,
      }));
  }, [rows, selected]);

  const mainPaneContent = (
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
              <h1 className="text-[20px] font-semibold text-[var(--fg)] tracking-tight">
                {heading}
              </h1>
              <p className="text-[12px] text-[var(--fg-dim)] mt-0.5">
                {filtered.length.toLocaleString()} events ·{" "}
                <span className="text-[var(--fg)]">
                  ${(totalVol / 1_000_000).toFixed(1)}M
                </span>{" "}
                24h volume
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View mode toggle — Scanner = dense table, Cards = grid */}
            <div className="hidden md:flex items-center border border-[var(--border)] rounded-sm overflow-hidden font-mono text-[10px] tracking-[0.12em]">
              <button
                onClick={() => setViewMode("scanner")}
                className={`px-2.5 py-1 transition-colors ${
                  viewMode === "scanner"
                    ? "bg-[var(--accent-primary)] text-black"
                    : "text-[var(--fg-dim)] hover:text-[var(--fg)]"
                }`}
                title="Dense terminal table (1)"
              >
                SCANNER
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`px-2.5 py-1 border-l border-[var(--border)] transition-colors ${
                  viewMode === "cards"
                    ? "bg-[var(--accent-primary)] text-black"
                    : "text-[var(--fg-dim)] hover:text-[var(--fg)]"
                }`}
                title="Card grid (2)"
              >
                CARDS
              </button>
            </div>
            {viewMode === "scanner" && (
              <button
                onClick={() =>
                  exportRowsToCsv(
                    filtered.map((x) => x.row),
                    `futurist-${heading.toLowerCase().replace(/\s+/g, "-")}.csv`,
                  )
                }
                className="hidden md:inline font-mono text-[10px] tracking-[0.12em] text-[var(--fg-dim)] hover:text-[var(--accent-primary)] border border-[var(--border)] rounded-sm px-2.5 py-1"
                title="Export current view to CSV"
              >
                ↓ CSV
              </button>
            )}
            <button
              onClick={() => setTourOpen(true)}
              className="hidden md:inline font-mono text-[10px] tracking-[0.12em] text-[var(--fg-mute)] hover:text-[var(--accent-primary)] border border-[var(--border)] rounded-sm px-2.5 py-1"
              title="Take the terminal tour"
            >
              TOUR
            </button>
            <button
              onClick={() => setShowHelp(true)}
              className="hidden md:inline font-mono text-[10px] tracking-[0.12em] text-[var(--fg-mute)] hover:text-[var(--fg)] border border-[var(--border)] rounded-sm px-2.5 py-1"
              title="Keyboard shortcuts"
            >
              ?
            </button>
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

        {/* Body — Scanner table or Card grid */}
        {filtered.length === 0 ? (
          <EmptyState selection={selection} />
        ) : viewMode === "scanner" ? (
          <Scanner
            rows={filtered.map((x) => x.row)}
            onSelectRow={setSelectedId}
            selectedId={selectedId}
            highlightIdx={highlightIdx}
            onContextMenuRow={(r, e) => openContextMenu(r, e)}
          />
        ) : (
          <>
            <div
              ref={gridRef}
              className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
            >
              {filtered.slice(0, visible).map((x, idx) => {
                const isWatchlist =
                  selection.type === "view" &&
                  selection.view === "Watchlist";
                return (
                  <div
                    key={x.row.id}
                    data-card
                    // Only Watchlist + Cards mode gets drag-to-reorder — in
                    // every other view the row order is derived from the
                    // sort, not the user, so drag would be misleading.
                    draggable={isWatchlist}
                    onDragStart={
                      isWatchlist
                        ? (e) => {
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", x.row.id);
                          }
                        : undefined
                    }
                    onDragOver={
                      isWatchlist
                        ? (e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                          }
                        : undefined
                    }
                    onDrop={
                      isWatchlist
                        ? (e) => {
                            e.preventDefault();
                            const from = e.dataTransfer.getData("text/plain");
                            if (from && from !== x.row.id) {
                              reorderFavorites(from, x.row.id);
                            }
                          }
                        : undefined
                    }
                    className={`${
                      idx === highlightIdx
                        ? "ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--bg)] rounded-xl"
                        : ""
                    } ${isWatchlist ? "cursor-grab active:cursor-grabbing" : ""}`}
                    title={isWatchlist ? "Drag to reorder" : undefined}
                  >
                    <EventCard
                      row={x.row}
                      onClick={() => setSelectedId(x.row.id)}
                      onContextMenu={(e) => openContextMenu(x.row, e)}
                    />
                  </div>
                );
              })}
            </div>

            {visible < filtered.length && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  className="px-5 py-2 text-sm rounded-full bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--fg)] hover:bg-[var(--bg-hover)]"
                >
                  Load more · {filtered.length - visible} remaining
                </button>
              </div>
            )}
          </>
        )}
      </section>
  );

  return (
    <main className="flex-1 flex relative">
      <Sidebar
        selection={selection}
        onSelect={setSelection}
        counts={counts}
        watchlistCount={favorites.length}
        screeners={screeners}
        onOpenScreenerBuilder={(existing) => {
          setBuilderTarget(existing);
          setBuilderOpen(true);
        }}
        onDeleteScreener={(id) => {
          setScreeners((cur) => {
            const next = deleteScreener(cur, id);
            saveScreeners(next);
            return next;
          });
          // If the deleted one was active, snap back to All Markets
          if (selection.type === "screener" && selection.id === id) {
            setSelection({ type: "view", view: "All" });
          }
        }}
        open={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Desktop cockpit — three resizable panels. */}
      <div className="hidden md:flex flex-1 min-w-0">
        <DesktopCockpit
          main={mainPaneContent}
          detail={
            <DetailPane
              row={selected}
              news={selectedNews}
              trades={selectedTrades}
              candidates={correlationCandidates}
              isFavorite={selected ? favoritesSet.has(selected.id) : false}
              onToggleFavorite={() => {
                if (selected) toggleFavorite(selected.id);
              }}
              onSelectRow={setSelectedId}
            />
          }
          bottom={
            <BottomStrip
              rows={rows}
              news={news}
              onSelectRow={setSelectedId}
            />
          }
        />
      </div>

      {/* Mobile single column — same main content, overlay detail. */}
      <div className="md:hidden flex-1 min-w-0 flex">
        {mainPaneContent}
      </div>

      {/* Mobile-only overlay detail. On desktop the same data renders inline
          inside the cockpit's right panel, so we hide the overlay above md. */}
      {selected && (
        <div className="md:hidden">
          <MarketDetailPanel
            row={selected}
            news={selectedNews}
            trades={selectedTrades}
            candidates={correlationCandidates}
            isFavorite={favoritesSet.has(selected.id)}
            onClose={() => setSelectedId(null)}
            onToggleFavorite={() => toggleFavorite(selected.id)}
            onSelectRow={setSelectedId}
          />
        </div>
      )}

      {showHelp && <ShortcutsModal onClose={() => setShowHelp(false)} />}

      {tourOpen && <OnboardingTour onClose={() => setTourOpen(false)} />}

      {contextMenu && (() => {
        const target = rows.find((r) => r.id === contextMenu.rowId);
        if (!target) return null;
        const url =
          target.polymarket?.url ??
          target.kalshi?.url ??
          "";
        const isFav = favoritesSet.has(target.id);
        const items: ContextMenuItem[] = [
          {
            key: "open",
            label: "Open detail",
            icon: "→",
            hint: "⏎",
            onClick: () => setSelectedId(target.id),
          },
          {
            key: "fav",
            label: isFav ? "Remove from watchlist" : "Add to watchlist",
            icon: isFav ? "★" : "☆",
            hint: "f",
            onClick: () => toggleFavorite(target.id),
          },
          { key: "sep1", label: "", separator: true, onClick: () => {} },
          {
            key: "copy-url",
            label: "Copy exchange URL",
            icon: "⧉",
            disabled: !url,
            onClick: () => {
              if (url) navigator.clipboard.writeText(url).catch(() => {});
            },
          },
          {
            key: "copy-q",
            label: "Copy question",
            icon: "T",
            onClick: () => {
              navigator.clipboard.writeText(target.question).catch(() => {});
            },
          },
          { key: "sep2", label: "", separator: true, onClick: () => {} },
          {
            key: "alert",
            label: "Set price alert",
            icon: "!",
            disabled: !target.polymarket?.yesPrice,
            onClick: () => setSelectedId(target.id),
          },
        ];
        return (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            items={items}
            onClose={() => setContextMenu(null)}
          />
        );
      })()}

      {builderOpen && (
        <ScreenerBuilder
          existing={builderTarget}
          totalSaved={screeners.length}
          onSave={(preset) => {
            setScreeners((cur) => {
              const next = upsertScreener(cur, preset);
              saveScreeners(next);
              return next;
            });
            setBuilderOpen(false);
            setBuilderTarget(null);
            // Jump to the newly-saved screener so the user sees it apply
            setSelection({ type: "screener", id: preset.id });
          }}
          onClose={() => {
            setBuilderOpen(false);
            setBuilderTarget(null);
          }}
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
          : "bg-[var(--bg-elev)] text-[var(--fg-dim)] border-[var(--border)] hover:text-[var(--fg)] hover:border-[#3a3a3a]"
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
      <div className="text-sm text-[var(--fg)]">{title}</div>
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
    ["1", "Switch to Scanner view"],
    ["2", "Switch to Cards view"],
    ["Right-click", "Context menu on any market"],
    ["Drag", "Reorder cards in Watchlist view"],
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
          <h2 className="text-sm font-semibold text-[var(--fg)]">
            Keyboard shortcuts
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--fg-dim)] hover:text-[var(--fg)] text-lg"
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
