"use client";

import { useEffect } from "react";
import type {
  ScreenerRow,
  NewsItem,
  TradeEvent,
} from "@/lib/exchanges/types";
import { fmtPct, fmtUsd, fmtRelativeDate, fmtSmartTime } from "@/lib/format";
import { PriceChart } from "./PriceChart";
import { AlertButton } from "./AlertButton";
import { OrderBook } from "./OrderBook";
import { CorrelatedMarkets, type Candidate } from "./CorrelatedMarkets";
import { AiOverview } from "./AiOverview";

type Props = {
  row: ScreenerRow;
  news: NewsItem[];
  trades: TradeEvent[];
  /** Same-bucket candidate peers for correlation. Optional — legacy callers
   *  (CalendarView / old Screener) render without correlations. */
  candidates?: Candidate[];
  isFavorite: boolean;
  onClose: () => void;
  onToggleFavorite: () => void;
  /** Optional — legacy callers ignore row-select from within the detail. */
  onSelectRow?: (rowId: string) => void;
};

export function MarketDetailPanel({
  row,
  news,
  trades,
  candidates = [],
  isFavorite,
  onClose,
  onToggleFavorite,
  onSelectRow,
}: Props) {
  const handleSelectRow = onSelectRow ?? (() => {});
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
        aria-hidden
      />
      <aside className="fixed top-0 right-0 h-full w-[520px] max-w-[90vw] bg-[var(--bg-elev)] border-l border-[var(--border)] z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-[var(--accent-primary)]">
              {row.bucket}
              {row.closesAt && (
                <span className="text-[var(--fg-dim)] ml-2 normal-case tracking-normal">
                  · {fmtRelativeDate(row.closesAt)} left
                </span>
              )}
            </div>
            <h2 className="text-sm font-semibold text-[var(--fg)] mt-1 leading-snug">
              {row.question}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleFavorite}
              className={`text-base ${
                isFavorite
                  ? "text-[var(--accent-amber)]"
                  : "text-[var(--fg-mute)] hover:text-[var(--accent-amber)]"
              }`}
              aria-label={isFavorite ? "Unfavorite" : "Favorite"}
            >
              {isFavorite ? "★" : "☆"}
            </button>
            <button
              onClick={onClose}
              className="text-[var(--fg-dim)] hover:text-[var(--fg)] text-lg leading-none w-6 h-6 flex items-center justify-center"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {/* Per-exchange quotes */}
          <Section title="Quotes">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[var(--fg-dim)] uppercase text-[10px]">
                  <th className="py-1 font-normal">Exchange</th>
                  <th className="py-1 font-normal text-right">Yes</th>
                  <th className="py-1 font-normal text-right">No</th>
                  <th className="py-1 font-normal text-right">Vol 24h</th>
                  <th className="py-1 font-normal text-right">Link</th>
                </tr>
              </thead>
              <tbody>
                <ExchangeRow name="POLYMARKET" quote={row.polymarket} />
                <ExchangeRow name="KALSHI" quote={row.kalshi} />
              </tbody>
            </table>
            {row.spread !== null && (
              <div className="mt-3 text-[11px] flex items-center justify-between border-t border-[var(--border)] pt-2">
                <span className="uppercase tracking-wider text-[var(--fg-dim)]">
                  Spread (max−min YES)
                </span>
                <span
                  className={`font-semibold ${
                    row.spread > 0.05
                      ? "text-[var(--accent-amber)]"
                      : "text-[var(--fg)]"
                  }`}
                >
                  {fmtPct(row.spread)}
                </span>
              </div>
            )}
          </Section>

          {/* Candidates list (multi-outcome events) */}
          {(row.polymarket?.siblings && row.polymarket.siblings.length > 0) ||
          (row.kalshi?.siblings && row.kalshi.siblings.length > 0) ? (
            <Section
              title={`Candidates (${
                (row.polymarket?.siblings?.length ?? 0) +
                (row.kalshi?.siblings?.length ?? 0) +
                (row.polymarket || row.kalshi ? 1 : 0)
              })`}
            >
              <SiblingsList row={row} />
            </Section>
          ) : null}

          {/* Order Book — Polymarket CLOB L2 */}
          <Section title="Order Book (Polymarket)">
            <OrderBook tokenId={row.polymarketYesTokenId} />
          </Section>

          {/* Real chart */}
          <Section title="Price History">
            <PriceChart tokenId={row.polymarketYesTokenId} />
          </Section>

          {/* News Wire — live Google News headlines about this event */}
          <Section title="News Wire">
            <AiOverview row={row} />
          </Section>

          {/* Correlated Markets */}
          <Section title="Correlated Markets">
            <CorrelatedMarkets
              seedTokenId={row.polymarketYesTokenId}
              candidates={candidates}
              onSelectRow={handleSelectRow}
            />
          </Section>

          {/* Alerts */}
          <Section title="Alerts">
            {row.polymarket?.yesPrice !== null &&
            row.polymarket?.yesPrice !== undefined ? (
              <AlertButton
                exchange="POLYMARKET"
                externalMarketId={row.id.replace(/^POLYMARKET-/, "")}
                marketQuestion={row.question}
                yesPrice={row.polymarket.yesPrice}
              />
            ) : (
              <div className="text-[var(--fg-dim)] text-xs">
                No Polymarket quote — alerts unavailable.
              </div>
            )}
          </Section>

          {/* Related news */}
          <Section title={`News affecting this market (${news.length})`}>
            {news.length === 0 ? (
              <div className="text-[var(--fg-dim)] text-xs py-2">
                No news items currently linked. Real news provider connects when
                you add a NEWS_API_KEY.
              </div>
            ) : (
              <ul className="space-y-2">
                {news.map((n) => (
                  <li
                    key={n.id}
                    className="border border-[var(--border)] p-2 bg-black/40 hover:bg-black/70 transition-colors"
                  >
                    <div className="flex items-baseline justify-between gap-2 text-[10px] uppercase tracking-wider text-[var(--fg-dim)]">
                      <span className="text-[var(--accent-primary)]">
                        {n.source}
                      </span>
                      <span>{fmtSmartTime(n.timestamp)}</span>
                    </div>
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs mt-1 text-[var(--fg)] hover:text-[var(--accent-primary)]"
                    >
                      {n.headline}
                    </a>
                    {n.priceImpact !== undefined && (
                      <div className="mt-1.5 text-[10px] uppercase tracking-wider">
                        <span className="text-[var(--fg-dim)]">
                          Est. price impact:{" "}
                        </span>
                        <span
                          className={
                            n.priceImpact >= 0
                              ? "text-[var(--accent-up)] font-semibold"
                              : "text-[var(--accent-down)] font-semibold"
                          }
                        >
                          {n.priceImpact >= 0 ? "+" : ""}
                          {(n.priceImpact * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Recent trades */}
          <Section title={`Recent large trades (${trades.length})`}>
            {trades.length === 0 ? (
              <div className="text-[var(--fg-dim)] text-xs py-2">
                No matching trades in the recent window.
              </div>
            ) : (
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-[var(--fg-dim)] uppercase text-[10px] text-left">
                    <th className="py-1 font-normal">Time</th>
                    <th className="py-1 font-normal">Side</th>
                    <th className="py-1 font-normal text-right">Price</th>
                    <th className="py-1 font-normal text-right">Size</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t) => (
                    <tr
                      key={t.id}
                      className="border-t border-[var(--border-soft)]"
                    >
                      <td className="py-1 text-[var(--fg-dim)]">
                        {fmtSmartTime(t.timestamp)}
                      </td>
                      <td className="py-1">
                        <span
                          className={
                            t.side === "BUY"
                              ? "text-[var(--accent-buy)]"
                              : "text-[var(--accent-sell)]"
                          }
                        >
                          {t.side} {t.outcome}
                        </span>
                      </td>
                      <td className="py-1 text-right">
                        {fmtPct(t.price, 1)}
                      </td>
                      <td className="py-1 text-right text-[var(--fg)] font-semibold">
                        {fmtUsd(t.sizeUsd, { compact: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section title="Stats">
            <dl className="text-xs grid grid-cols-2 gap-y-1 gap-x-3">
              <dt className="text-[var(--fg-dim)]">Total volume 24h</dt>
              <dd className="text-right">{fmtUsd(row.volume24h)}</dd>
              <dt className="text-[var(--fg-dim)]">Liquidity</dt>
              <dd className="text-right">{fmtUsd(row.liquidity)}</dd>
              <dt className="text-[var(--fg-dim)]">Closes</dt>
              <dd className="text-right">
                {row.closesAt ? row.closesAt.toLocaleString() : "—"}
              </dd>
              <dt className="text-[var(--fg-dim)]">Source category</dt>
              <dd className="text-right text-[var(--fg-dim)]">
                {row.rawCategory ?? "—"}
              </dd>
            </dl>
          </Section>
        </div>

        <div className="border-t border-[var(--border)] px-4 py-2 text-[10px] uppercase tracking-wider text-[var(--fg-dim)]">
          Press ESC to close
        </div>
      </aside>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[var(--border)] px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-[var(--fg-dim)] mb-2">
        {title}
      </div>
      {children}
    </div>
  );
}

function ExchangeRow({
  name,
  quote,
}: {
  name: string;
  quote: {
    yesPrice: number | null;
    noPrice: number | null;
    url: string;
    volume24h: number | null;
  } | null;
}) {
  if (!quote) {
    return (
      <tr className="border-t border-[var(--border-soft)]">
        <td className="py-1.5 text-[var(--fg-mute)]">{name}</td>
        <td className="py-1.5 text-right text-[var(--fg-mute)]">—</td>
        <td className="py-1.5 text-right text-[var(--fg-mute)]">—</td>
        <td className="py-1.5 text-right text-[var(--fg-mute)]">—</td>
        <td className="py-1.5 text-right text-[var(--fg-mute)]">—</td>
      </tr>
    );
  }
  return (
    <tr className="border-t border-[var(--border-soft)]">
      <td className="py-1.5 text-[var(--accent-primary)]">{name}</td>
      <td className="py-1.5 text-right text-[var(--accent-up)] font-semibold">
        {fmtPct(quote.yesPrice)}
      </td>
      <td className="py-1.5 text-right text-[var(--accent-down)] font-semibold">
        {fmtPct(quote.noPrice)}
      </td>
      <td className="py-1.5 text-right">
        {quote.volume24h !== null
          ? `$${(quote.volume24h / 1000).toFixed(1)}K`
          : "—"}
      </td>
      <td className="py-1.5 text-right">
        <a
          href={quote.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-[var(--accent-amber)] hover:underline"
        >
          open ↗
        </a>
      </td>
    </tr>
  );
}

/**
 * Renders all candidates for a multi-outcome event. Includes the leader
 * (currently shown as the row headline) at the top, then siblings sorted
 * by descending probability. Shows side-by-side Kalshi prices when present.
 */
function SiblingsList({ row }: { row: ScreenerRow }) {
  type Cand = {
    label: string;
    polyPrice: number | null;
    kalshiPrice: number | null;
    url: string;
  };
  const cands: Cand[] = [];

  // Leader (the canonical row itself) appears first as a "primary" candidate.
  // For Kalshi-only multi-outcome events its leader label comes from the
  // question after the em-dash, or the question itself.
  const leaderLabel = leaderLabelFromQuestion(row.question);
  cands.push({
    label: leaderLabel,
    polyPrice: row.polymarket?.yesPrice ?? null,
    kalshiPrice: row.kalshi?.yesPrice ?? null,
    url: row.polymarket?.url ?? row.kalshi?.url ?? "",
  });

  // Siblings — for now we trust each exchange independently; cross-exchange
  // sibling matching is a future enhancement.
  const polyS = row.polymarket?.siblings ?? [];
  const kalshiS = row.kalshi?.siblings ?? [];
  // De-dupe by label (lowercase) when both exchanges list the same candidate.
  const map = new Map<string, Cand>();
  for (const s of polyS) {
    map.set(s.label.toLowerCase(), {
      label: s.label,
      polyPrice: s.yesPrice,
      kalshiPrice: null,
      url: s.externalUrl,
    });
  }
  for (const s of kalshiS) {
    const key = s.label.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.kalshiPrice = s.yesPrice;
    } else {
      map.set(key, {
        label: s.label,
        polyPrice: null,
        kalshiPrice: s.yesPrice,
        url: s.externalUrl,
      });
    }
  }
  cands.push(...map.values());

  cands.sort((a, b) => {
    const aMax = Math.max(a.polyPrice ?? 0, a.kalshiPrice ?? 0);
    const bMax = Math.max(b.polyPrice ?? 0, b.kalshiPrice ?? 0);
    return bMax - aMax;
  });

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-[var(--fg-dim)] uppercase text-[10px]">
          <th className="py-1 font-normal">Candidate</th>
          <th className="py-1 font-normal text-right">Polymarket</th>
          <th className="py-1 font-normal text-right">Kalshi</th>
        </tr>
      </thead>
      <tbody>
        {cands.map((c, i) => (
          <tr key={`${c.label}-${i}`} className="border-t border-[var(--border-soft)]">
            <td className="py-1.5 text-[var(--fg)] truncate max-w-[260px]" title={c.label}>
              {i === 0 && (
                <span className="text-[9px] uppercase tracking-wider text-[var(--accent-primary)] mr-1.5">
                  Lead
                </span>
              )}
              {c.label}
            </td>
            <td className="py-1.5 text-right">
              {c.polyPrice !== null ? (
                <span className="text-[var(--accent-up)] font-semibold">
                  {fmtPct(c.polyPrice)}
                </span>
              ) : (
                <span className="text-[var(--fg-mute)]">—</span>
              )}
            </td>
            <td className="py-1.5 text-right">
              {c.kalshiPrice !== null ? (
                <span className="text-[var(--accent-up)] font-semibold">
                  {fmtPct(c.kalshiPrice)}
                </span>
              ) : (
                <span className="text-[var(--fg-mute)]">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function leaderLabelFromQuestion(q: string): string {
  // "Who will be the next CEO of JP Morgan Chase? — Marianne Lake" → "Marianne Lake"
  const dash = q.lastIndexOf("—");
  if (dash >= 0 && dash < q.length - 1) {
    return q.slice(dash + 1).trim();
  }
  return q;
}

// fmtRelativeTime removed — now using fmtSmartTime from lib/format
