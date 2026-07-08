"use client";

import type { ScreenerRow } from "@/lib/exchanges/types";
import { fmtUsd, fmtRelativeDate } from "@/lib/format";

type Source = "Polymarket" | "Kalshi" | "Both";

export function getSource(r: ScreenerRow): Source {
  const hasPoly = typeof r.polymarket?.yesPrice === "number";
  const hasKalshi = typeof r.kalshi?.yesPrice === "number";
  if (hasPoly && hasKalshi) return "Both";
  if (hasPoly) return "Polymarket";
  if (hasKalshi) return "Kalshi";
  // If neither has a price, use whichever exchange the row was originally
  // built from — the polymarket quote object still exists even price-less.
  if (r.polymarket && r.kalshi) return "Both";
  if (r.polymarket) return "Polymarket";
  return "Kalshi";
}

function sourceStyle(source: Source) {
  switch (source) {
    case "Polymarket":
      return {
        bg: "rgba(110, 86, 207, 0.15)",
        color: "var(--src-polymarket)",
        border: "rgba(110, 86, 207, 0.4)",
      };
    case "Kalshi":
      return {
        bg: "rgba(20, 184, 166, 0.15)",
        color: "var(--src-kalshi)",
        border: "rgba(20, 184, 166, 0.4)",
      };
    case "Both":
      return {
        bg: "rgba(245, 158, 11, 0.15)",
        color: "var(--src-both)",
        border: "rgba(245, 158, 11, 0.4)",
      };
  }
}

export function EventCard({
  row,
  onClick,
  onContextMenu,
}: {
  row: ScreenerRow;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  const source = getSource(row);
  const ss = sourceStyle(source);

  // Pick the headline YES price to drive the progress bar. Prefer Polymarket
  // if both have one, otherwise whichever side has a price.
  const yes =
    (typeof row.polymarket?.yesPrice === "number"
      ? row.polymarket.yesPrice
      : null) ??
    (typeof row.kalshi?.yesPrice === "number" ? row.kalshi.yesPrice : null);
  const no =
    (typeof row.polymarket?.noPrice === "number"
      ? row.polymarket.noPrice
      : null) ??
    (typeof row.kalshi?.noPrice === "number" ? row.kalshi.noPrice : null) ??
    (yes !== null ? 1 - yes : null);

  const yesPct = yes !== null ? Math.round(yes * 100) : null;
  const noPct = no !== null ? Math.round(no * 100) : null;

  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      className="card-hover text-left w-full bg-[var(--bg-elev)] border border-[var(--border-soft)] rounded-xl p-4 flex flex-col gap-3"
    >
      {/* Header: source badge + category */}
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border"
          style={{
            background: ss.bg,
            color: ss.color,
            borderColor: ss.border,
          }}
        >
          {source}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-[var(--fg-mute)]">
          {row.bucket}
        </span>
      </div>

      {/* Title */}
      <div
        className="text-[14px] font-semibold leading-snug text-white overflow-hidden"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          minHeight: "3.6em",
        }}
      >
        {row.question}
      </div>

      {/* Probability bar */}
      {yesPct !== null ? (
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-[var(--accent-up)] font-semibold">
              YES {yesPct}%
            </span>
            <span className="text-[var(--accent-down)] font-semibold">
              {noPct !== null ? `NO ${noPct}%` : "—"}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[var(--border-soft)] overflow-hidden">
            <div
              className="h-full"
              style={{
                width: `${yesPct}%`,
                background: "var(--accent-up)",
              }}
            />
          </div>
        </div>
      ) : (
        <div className="text-[11px] text-[var(--fg-mute)]">No price yet</div>
      )}

      {/* Footer: volume + closing date */}
      <div className="flex items-center justify-between text-[11px] text-[var(--fg-dim)] mt-auto">
        <span>{fmtUsd(row.volume24h, { compact: true })} vol</span>
        {row.closesAt && (
          <span>closes {fmtRelativeDate(row.closesAt)}</span>
        )}
      </div>
    </button>
  );
}
