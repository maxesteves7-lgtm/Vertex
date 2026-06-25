"use client";

import { useState } from "react";
import { CATEGORY_TREE, type Category } from "@/lib/categories";

export type SidebarSelection = {
  bucket: Category | "All";
  sub: string | null;
};

export function Sidebar({
  selection,
  onSelect,
  counts,
}: {
  selection: SidebarSelection;
  onSelect: (sel: SidebarSelection) => void;
  /** Map of total counts per top-level bucket (and "All") for the badge. */
  counts: Record<string, number>;
}) {
  // Initially expand whichever bucket is currently selected
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(selection.bucket !== "All" ? [selection.bucket] : []),
  );

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const allActive = selection.bucket === "All";

  return (
    <aside className="w-60 shrink-0 border-r border-[var(--border)] bg-[var(--bg)] py-4 overflow-y-auto max-h-[calc(100vh-56px)] sticky top-14">
      <div className="px-3">
        <div className="text-[10px] uppercase tracking-wider text-[var(--fg-mute)] px-2 mb-2">
          Browse
        </div>

        <button
          onClick={() => onSelect({ bucket: "All", sub: null })}
          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors ${
            allActive
              ? "bg-[var(--bg-elev)] text-white"
              : "text-[var(--fg-dim)] hover:bg-[var(--bg-elev)] hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="text-[var(--accent-primary)]">●</span>
            All Markets
          </span>
          <span className="text-[11px] text-[var(--fg-mute)]">
            {counts.All ?? 0}
          </span>
        </button>

        <div className="mt-1 space-y-0.5">
          {CATEGORY_TREE.map((node) => {
            const isOpen = expanded.has(node.bucket);
            const bucketActive =
              selection.bucket === node.bucket && selection.sub === null;
            const bucketHasSelection = selection.bucket === node.bucket;
            const count = counts[node.bucket] ?? 0;

            return (
              <div key={node.bucket}>
                <div className="flex items-stretch">
                  <button
                    onClick={() => onSelect({ bucket: node.bucket, sub: null })}
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
                        selection.bucket === node.bucket &&
                        selection.sub === s.display;
                      return (
                        <button
                          key={s.display}
                          onClick={() =>
                            onSelect({ bucket: node.bucket, sub: s.display })
                          }
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
  );
}
