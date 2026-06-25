"use client";

import { useState } from "react";
import { CATEGORY_TREE, type Category } from "@/lib/categories";

export type ViewKey =
  | "All"
  | "Movers"
  | "Closing"
  | "Watchlist";

export type SidebarSelection =
  | { type: "view"; view: ViewKey }
  | { type: "category"; bucket: Category; sub: string | null };

const DISCOVER: Array<{ view: ViewKey; label: string; icon: string }> = [
  { view: "All", label: "All Markets", icon: "●" },
  { view: "Movers", label: "Market Movers", icon: "📈" },
  { view: "Closing", label: "Closing Soon", icon: "⏰" },
  { view: "Watchlist", label: "Watchlist", icon: "★" },
];

export function Sidebar({
  selection,
  onSelect,
  counts,
  watchlistCount,
  open,
  onCloseMobile,
}: {
  selection: SidebarSelection;
  onSelect: (sel: SidebarSelection) => void;
  /** Map of total counts per top-level bucket (and "All") for the badge. */
  counts: Record<string, number>;
  watchlistCount: number;
  /** Mobile drawer open state — controlled by parent. */
  open: boolean;
  onCloseMobile: () => void;
}) {
  // Initially expand whichever bucket is currently selected
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(selection.type === "category" ? [selection.bucket] : []),
  );

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 z-30 md:hidden transition-opacity ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onCloseMobile}
        aria-hidden
      />

      <aside
        className={`fixed md:sticky top-14 left-0 z-40 md:z-auto w-60 shrink-0 border-r border-[var(--border)] bg-[var(--bg)] py-4 overflow-y-auto max-h-[calc(100vh-56px)] transition-transform md:transform-none ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
      <div className="px-3">
        <div className="text-[10px] uppercase tracking-wider text-[var(--fg-mute)] px-2 mb-2">
          Discover
        </div>

        <div className="space-y-0.5">
          {DISCOVER.map((d) => {
            const active =
              selection.type === "view" && selection.view === d.view;
            const count =
              d.view === "All"
                ? counts.All ?? 0
                : d.view === "Watchlist"
                  ? watchlistCount
                  : undefined;
            return (
              <button
                key={d.view}
                onClick={() => {
                  onSelect({ type: "view", view: d.view });
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-[var(--bg-elev)] text-white"
                    : "text-[var(--fg-dim)] hover:bg-[var(--bg-elev)] hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-[var(--accent-primary)] text-[12px]">
                    {d.icon}
                  </span>
                  {d.label}
                </span>
                {count !== undefined && (
                  <span className="text-[11px] text-[var(--fg-mute)]">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="text-[10px] uppercase tracking-wider text-[var(--fg-mute)] px-2 mt-5 mb-2">
          Categories
        </div>

        <div className="space-y-0.5">
          {CATEGORY_TREE.map((node) => {
            const isOpen = expanded.has(node.bucket);
            const bucketActive =
              selection.type === "category" &&
              selection.bucket === node.bucket &&
              selection.sub === null;
            const bucketHasSelection =
              selection.type === "category" && selection.bucket === node.bucket;
            const count = counts[node.bucket] ?? 0;

            return (
              <div key={node.bucket}>
                <div className="flex items-stretch">
                  <button
                    onClick={() => {
                      onSelect({
                        type: "category",
                        bucket: node.bucket,
                        sub: null,
                      });
                      onCloseMobile();
                    }}
                    className={`flex-1 flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors text-left ${
                      bucketActive
                        ? "bg-[var(--bg-elev)] text-white"
                        : bucketHasSelection
                          ? "text-white hover:bg-[var(--bg-elev)]"
                          : "text-[var(--fg-dim)] hover:bg-[var(--bg-elev)] hover:text-white"
                    }`}
                  >
                    <span>{node.display}</span>
                    <span className="text-[11px] text-[var(--fg-mute)]">
                      {count}
                    </span>
                  </button>
                  {node.subs.length > 0 && (
                    <button
                      onClick={() => toggle(node.bucket)}
                      aria-label={isOpen ? "Collapse" : "Expand"}
                      className="px-2 text-[var(--fg-mute)] hover:text-white"
                    >
                      <span
                        className="inline-block transition-transform"
                        style={{
                          transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                        }}
                      >
                        ›
                      </span>
                    </button>
                  )}
                </div>

                {isOpen && node.subs.length > 0 && (
                  <div className="ml-3 mt-0.5 mb-1 space-y-0.5 border-l border-[var(--border-soft)] pl-2">
                    {node.subs.map((s) => {
                      const subActive =
                        selection.type === "category" &&
                        selection.bucket === node.bucket &&
                        selection.sub === s.display;
                      return (
                        <button
                          key={s.display}
                          onClick={() => {
                            onSelect({
                              type: "category",
                              bucket: node.bucket,
                              sub: s.display,
                            });
                            onCloseMobile();
                          }}
                          className={`w-full text-left px-2 py-1 rounded-md text-[13px] transition-colors ${
                            subActive
                              ? "bg-[var(--bg-elev)] text-white"
                              : "text-[var(--fg-dim)] hover:bg-[var(--bg-elev)] hover:text-white"
                          }`}
                        >
                          {s.display}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      </aside>
    </>
  );
}
