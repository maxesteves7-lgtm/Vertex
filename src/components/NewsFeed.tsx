"use client";

import { useMemo, useState } from "react";
import type { NewsItem } from "@/lib/exchanges/types";
import type { Category } from "@/lib/categories";
import { fmtSmartTime } from "@/lib/format";

type MarketRef = { id: string; question: string; bucket: Category };

export function NewsFeed({
  news,
  marketLookup,
}: {
  news: NewsItem[];
  marketLookup: Record<string, MarketRef>;
}) {
  const [search, setSearch] = useState("");
  const [impactFilter, setImpactFilter] = useState<"ALL" | "POS" | "NEG">("ALL");

  const filtered = useMemo(() => {
    let out = news;
    if (impactFilter === "POS")
      out = out.filter((n) => (n.priceImpact ?? 0) > 0);
    if (impactFilter === "NEG")
      out = out.filter((n) => (n.priceImpact ?? 0) < 0);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(
        (n) =>
          n.headline.toLowerCase().includes(q) ||
          n.source.toLowerCase().includes(q) ||
          n.summary?.toLowerCase().includes(q),
      );
    }
    return out;
  }, [news, search, impactFilter]);

  return (
    <div className="flex-1 flex flex-col">
      {/* Filter bar */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-2.5 bg-[var(--bg-elev)]">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search headlines…"
          className="bg-[var(--bg)] border border-[var(--border)] px-3 py-1.5 text-xs w-56 rounded-sm focus:outline-none focus:border-[var(--accent-primary)] placeholder:text-[var(--fg-mute)]"
        />
        <div className="flex items-center gap-1.5">
          {(["ALL", "POS", "NEG"] as const).map((f) => {
            const label = f === "ALL" ? "All" : f === "POS" ? "Bullish" : "Bearish";
            const active = impactFilter === f;
            const cls =
              f === "POS"
                ? "text-[var(--accent-up)]"
                : f === "NEG"
                  ? "text-[var(--accent-down)]"
                  : "text-[var(--fg-dim)]";
            return (
              <button
                key={f}
                onClick={() => setImpactFilter(f)}
                className={`px-2.5 py-1 text-[11px] uppercase tracking-wider rounded-sm border transition-colors ${
                  active
                    ? "border-[var(--fg-dim)] bg-[var(--bg-row)]"
                    : "border-[var(--border)] hover:border-[var(--fg-dim)]"
                } ${active ? cls : "text-[var(--fg-dim)]"}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-auto">
        <ul>
          {filtered.map((n) => (
            <li
              key={n.id}
              className="border-b border-[var(--border-soft)] px-4 py-3 hover:bg-[var(--bg-row)]"
            >
              <div className="flex items-baseline justify-between gap-3 text-[10px] uppercase tracking-wider text-[var(--fg-dim)]">
                <span>
                  <span className="text-[var(--accent-primary)] font-semibold">
                    {n.source}
                  </span>
                  <span className="ml-2">{fmtSmartTime(n.timestamp)}</span>
                </span>
                {n.priceImpact !== undefined && (
                  <span
                    className={
                      n.priceImpact >= 0
                        ? "text-[var(--accent-up)] font-semibold"
                        : "text-[var(--accent-down)] font-semibold"
                    }
                  >
                    {n.priceImpact >= 0 ? "▲" : "▼"} {Math.abs(n.priceImpact * 100).toFixed(1)}%
                  </span>
                )}
              </div>
              <a
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm font-semibold mt-1 text-[var(--fg)] hover:text-[var(--accent-primary)]"
              >
                {n.headline}
              </a>
              {n.summary && (
                <p className="text-[11px] text-[var(--fg-dim)] mt-1 leading-relaxed">
                  {n.summary}
                </p>
              )}
              {n.affectedMarketIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--fg-dim)] mr-1">
                    Affects:
                  </span>
                  {n.affectedMarketIds.slice(0, 6).map((id) => {
                    const m = marketLookup[id];
                    if (!m) return null;
                    return (
                      <span
                        key={id}
                        className="text-[10px] px-1.5 py-0.5 bg-[#0f1d22] text-[var(--accent-primary)] border border-[#173039] rounded-sm max-w-[260px] truncate"
                        title={m.question}
                      >
                        {m.question}
                      </span>
                    );
                  })}
                  {n.affectedMarketIds.length > 6 && (
                    <span className="text-[10px] text-[var(--fg-dim)]">
                      +{n.affectedMarketIds.length - 6} more
                    </span>
                  )}
                </div>
              )}
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-12 text-center text-[var(--fg-dim)] text-xs">
              NO HEADLINES MATCH FILTERS
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

// fmtRelativeTime removed — now using fmtSmartTime from lib/format
