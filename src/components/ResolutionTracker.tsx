"use client";

import { useMemo, useState } from "react";
import type { ResolvedMarket } from "@/lib/exchanges/polymarket";
import { fmtUsd, fmtSmartTime } from "@/lib/format";
import { bucketize, CATEGORIES, type Category } from "@/lib/categories";

type OutcomeFilter = "All" | "YES" | "NO";

export function ResolutionTracker({
  resolved,
}: {
  resolved: ResolvedMarket[];
}) {
  const [outcome, setOutcome] = useState<OutcomeFilter>("All");
  const [category, setCategory] = useState<Category | "All">("All");
  const [search, setSearch] = useState("");

  const enriched = useMemo(
    () =>
      resolved.map((r) => ({
        ...r,
        bucket: bucketize(r.category, r.question),
      })),
    [resolved],
  );

  const filtered = useMemo(() => {
    let out = enriched;
    if (outcome !== "All") out = out.filter((r) => r.outcome === outcome);
    if (category !== "All") out = out.filter((r) => r.bucket === category);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((r) => r.question.toLowerCase().includes(q));
    }
    return out;
  }, [enriched, outcome, category, search]);

  const yesCount = enriched.filter((r) => r.outcome === "YES").length;
  const noCount = enriched.filter((r) => r.outcome === "NO").length;

  return (
    <section className="flex-1 flex flex-col px-4 md:px-6 py-5">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-5">
        <div>
          <h1 className="text-[20px] font-semibold text-white tracking-tight">
            Recently Resolved
          </h1>
          <p className="text-[12px] text-[var(--fg-dim)] mt-0.5">
            The most recently closed Polymarket markets and how they settled.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <Pill label="Resolved" value={enriched.length.toLocaleString()} />
          <Pill
            label="YES"
            value={yesCount.toLocaleString()}
            color="text-[var(--accent-up)]"
          />
          <Pill
            label="NO"
            value={noCount.toLocaleString()}
            color="text-[var(--accent-down)]"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-mute)]">
            ⌕
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter…"
            className="bg-[var(--bg-elev)] border border-transparent focus:border-[var(--border)] rounded-full pl-9 pr-4 py-1.5 text-[13px] w-64 outline-none text-white placeholder:text-[var(--fg-mute)]"
          />
        </div>

        <Chip
          active={outcome === "All"}
          onClick={() => setOutcome("All")}
        >
          All outcomes
        </Chip>
        <Chip active={outcome === "YES"} onClick={() => setOutcome("YES")}>
          YES
        </Chip>
        <Chip active={outcome === "NO"} onClick={() => setOutcome("NO")}>
          NO
        </Chip>

        <span className="mx-2 h-5 w-px bg-[var(--border)]" aria-hidden />

        <select
          value={category}
          onChange={(e) =>
            setCategory(e.target.value as Category | "All")
          }
          className="bg-[var(--bg-elev)] border border-[var(--border)] rounded-full px-3 py-1.5 text-[12px] text-white outline-none"
        >
          {(["All", ...CATEGORIES.filter((c) => c !== "All")] as const).map(
            (c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ),
          )}
        </select>
      </div>

      <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-elev)] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="border-b border-[var(--border)] text-left text-[var(--fg-dim)] uppercase text-[10px] tracking-wider">
            <tr>
              <th className="px-4 py-2.5 w-28">Closed</th>
              <th className="px-3 py-2.5">Market</th>
              <th className="px-3 py-2.5 w-24 text-right">Volume</th>
              <th className="px-3 py-2.5 w-24 text-right">Outcome</th>
              <th className="px-3 py-2.5 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="border-b border-[var(--border-soft)] hover:bg-[var(--bg-row)] transition-colors"
              >
                <td className="px-4 py-2.5 text-[var(--fg-dim)] text-[11px]">
                  {fmtSmartTime(r.endDate)}
                </td>
                <td className="px-3 py-2.5 max-w-[640px]">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--bg-row)] text-[var(--fg-dim)]">
                      {r.bucket}
                    </span>
                    <span className="truncate text-white">{r.question}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-[var(--fg-dim)]">
                  {fmtUsd(r.volume24h, { compact: true })}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <OutcomeBadge outcome={r.outcome} />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent-amber)] hover:underline text-[11px]"
                  >
                    open ↗
                  </a>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-16 text-center text-[var(--fg-dim)] text-sm"
                >
                  No resolved markets match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Pill({
  label,
  value,
  color = "text-white",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="px-3 py-1.5 rounded-full bg-[var(--bg-elev)] border border-[var(--border-soft)] flex items-center gap-2">
      <span className="text-[var(--fg-dim)] uppercase text-[10px] tracking-wider">
        {label}
      </span>
      <span className={`font-semibold tabular-nums ${color}`}>{value}</span>
    </div>
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

function OutcomeBadge({
  outcome,
}: {
  outcome: "YES" | "NO" | "UNRESOLVED";
}) {
  if (outcome === "YES") {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold text-[var(--accent-up)] bg-[rgba(0,200,5,0.12)]">
        Yes
      </span>
    );
  }
  if (outcome === "NO") {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold text-[var(--accent-down)] bg-[rgba(255,80,0,0.12)]">
        No
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold text-[var(--fg-dim)] bg-[var(--bg-row)]">
      —
    </span>
  );
}
