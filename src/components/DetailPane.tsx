"use client";

import type {
  ScreenerRow,
  NewsItem,
  TradeEvent,
} from "@/lib/exchanges/types";
import { fmtPct, fmtUsd, fmtRelativeDate, fmtSmartTime } from "@/lib/format";
import { PriceChart } from "./PriceChart";
import { AlertButton } from "./AlertButton";
import { getSource } from "./EventCard";
import { OrderBook } from "./OrderBook";
import { CorrelatedMarkets, type Candidate } from "./CorrelatedMarkets";

/**
 * Always-visible inline detail pane for the desktop cockpit. When no market
 * is selected, shows an empty-state prompt; otherwise renders the same
 * information sections as the overlay MarketDetailPanel, but laid out for
 * a fixed-width side column instead of a full-screen drawer.
 */
export function DetailPane({
  row,
  news,
  trades,
  candidates,
  isFavorite,
  onToggleFavorite,
  onSelectRow,
}: {
  row: ScreenerRow | null;
  news: NewsItem[];
  trades: TradeEvent[];
  /** Candidate peers for correlation — Polymarket-backed rows in the same bucket. */
  candidates: Candidate[];
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onSelectRow: (rowId: string) => void;
}) {
  if (!row) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6">
        <div className="font-mono text-[10px] tracking-[0.18em] text-[var(--fg-mute)] mb-3">
          DETAIL PANE
        </div>
        <div className="text-[13px] text-[var(--fg-dim)] max-w-[260px]">
          Select an event from the scanner to load its quotes, price history,
          recent trades, and related news here.
        </div>
        <div className="mt-4 font-mono text-[10px] text-[var(--fg-mute)]">
          ↑↓ or j/k to navigate · ⏎ to open
        </div>
      </div>
    );
  }

  const source = getSource(row);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="border-b border-[var(--border)] px-4 py-3 sticky top-0 bg-[var(--bg-elev)] z-10">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span
              className="px-1.5 py-0.5 rounded-sm font-mono text-[10px] tracking-wider"
              style={{
                color:
                  source === "Polymarket"
                    ? "var(--src-polymarket)"
                    : source === "Kalshi"
                      ? "var(--src-kalshi)"
                      : "var(--accent-primary)",
                background:
                  source === "Polymarket"
                    ? "rgba(110,86,207,0.12)"
                    : source === "Kalshi"
                      ? "rgba(20,184,166,0.12)"
                      : "rgba(255,102,0,0.12)",
              }}
            >
              {source.toUpperCase()}
            </span>
            <span className="font-mono text-[10px] tracking-[0.14em] text-[var(--fg-mute)]">
              {row.bucket.toUpperCase()}
            </span>
            {row.closesAt && (
              <span className="font-mono text-[10px] text-[var(--fg-mute)]">
                · CLOSES {fmtRelativeDate(row.closesAt)}
              </span>
            )}
          </div>
          <button
            onClick={onToggleFavorite}
            className={`text-base leading-none ${
              isFavorite
                ? "text-[var(--accent-primary)]"
                : "text-[var(--fg-mute)] hover:text-[var(--accent-primary)]"
            }`}
            aria-label={isFavorite ? "Unfavorite" : "Favorite"}
          >
            {isFavorite ? "★" : "☆"}
          </button>
        </div>
        <h2 className="text-[14px] font-semibold text-white leading-snug">
          {row.question}
        </h2>
      </div>

      {/* Per-exchange quotes */}
      <Section title="Quotes">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-left text-[var(--fg-mute)] font-mono text-[10px] tracking-wider">
              <th className="py-1 font-normal">EXCHANGE</th>
              <th className="py-1 font-normal text-right">YES</th>
              <th className="py-1 font-normal text-right">NO</th>
              <th className="py-1 font-normal text-right">VOL 24H</th>
              <th className="py-1 font-normal text-right">LINK</th>
            </tr>
          </thead>
          <tbody>
            <ExchangeRow name="POLY" quote={row.polymarket} />
            <ExchangeRow name="KAL" quote={row.kalshi} />
          </tbody>
        </table>
        {row.spread !== null && (
          <div className="mt-3 text-[11px] flex items-center justify-between border-t border-[var(--border)] pt-2">
            <span className="uppercase tracking-wider text-[var(--fg-mute)] font-mono">
              SPREAD
            </span>
            <span
              className={`font-semibold font-mono tabular-nums ${
                row.spread > 0.05
                  ? "text-[var(--accent-primary)]"
                  : "text-[var(--fg)]"
              }`}
            >
              {fmtPct(row.spread)}
            </span>
          </div>
        )}
      </Section>

      {/* Order Book — Polymarket CLOB L2 */}
      <Section title="Order Book (Polymarket)">
        <OrderBook tokenId={row.polymarketYesTokenId} />
      </Section>

      {/* Price History */}
      <Section title="Price History (Polymarket YES)">
        <PriceChart tokenId={row.polymarketYesTokenId} />
      </Section>

      {/* Correlated Markets */}
      <Section title="Correlated Markets">
        <CorrelatedMarkets
          seedTokenId={row.polymarketYesTokenId}
          candidates={candidates}
          onSelectRow={onSelectRow}
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
          <div className="text-[var(--fg-mute)] text-xs">
            No Polymarket quote — alerts unavailable.
          </div>
        )}
      </Section>

      {/* News */}
      <Section title={`News (${news.length})`}>
        {news.length === 0 ? (
          <div className="text-[var(--fg-mute)] text-xs py-2">
            No news items currently linked.
          </div>
        ) : (
          <ul className="space-y-2">
            {news.slice(0, 6).map((n) => (
              <li
                key={n.id}
                className="border border-[var(--border-soft)] p-2 bg-[var(--bg)]/40 hover:bg-[var(--bg-row)] transition-colors"
              >
                <div className="flex items-baseline justify-between gap-2 text-[10px] uppercase tracking-wider text-[var(--fg-mute)] font-mono">
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
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Recent trades */}
      <Section title={`Large Trades (${trades.length})`}>
        {trades.length === 0 ? (
          <div className="text-[var(--fg-mute)] text-xs py-2">
            No matching trades in window.
          </div>
        ) : (
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-[var(--fg-mute)] font-mono uppercase text-[10px] text-left">
                <th className="py-1 font-normal">TIME</th>
                <th className="py-1 font-normal">SIDE</th>
                <th className="py-1 font-normal text-right">PX</th>
                <th className="py-1 font-normal text-right">SIZE</th>
              </tr>
            </thead>
            <tbody>
              {trades.slice(0, 12).map((t) => (
                <tr key={t.id} className="border-t border-[var(--border-soft)]">
                  <td className="py-1 text-[var(--fg-mute)] font-mono">
                    {fmtSmartTime(t.timestamp)}
                  </td>
                  <td className="py-1">
                    <span
                      className={
                        t.side === "BUY"
                          ? "text-[var(--accent-up)]"
                          : "text-[var(--accent-down)]"
                      }
                    >
                      {t.side} {t.outcome}
                    </span>
                  </td>
                  <td className="py-1 text-right font-mono tabular-nums">
                    {fmtPct(t.price, 1)}
                  </td>
                  <td className="py-1 text-right text-[var(--fg)] font-semibold font-mono tabular-nums">
                    {fmtUsd(t.sizeUsd, { compact: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Stats */}
      <Section title="Stats">
        <dl className="text-xs grid grid-cols-2 gap-y-1 gap-x-3 font-mono">
          <dt className="text-[var(--fg-mute)] uppercase tracking-wider text-[10px]">
            Total volume 24h
          </dt>
          <dd className="text-right tabular-nums">{fmtUsd(row.volume24h)}</dd>
          <dt className="text-[var(--fg-mute)] uppercase tracking-wider text-[10px]">
            Liquidity
          </dt>
          <dd className="text-right tabular-nums">{fmtUsd(row.liquidity)}</dd>
          <dt className="text-[var(--fg-mute)] uppercase tracking-wider text-[10px]">
            Closes
          </dt>
          <dd className="text-right tabular-nums">
            {row.closesAt ? row.closesAt.toLocaleString() : "—"}
          </dd>
        </dl>
      </Section>
    </div>
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
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--fg-mute)] mb-2">
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
        <td className="py-1.5 text-[var(--fg-mute)] font-mono">{name}</td>
        <td className="py-1.5 text-right text-[var(--fg-mute)] font-mono">
          —
        </td>
        <td className="py-1.5 text-right text-[var(--fg-mute)] font-mono">
          —
        </td>
        <td className="py-1.5 text-right text-[var(--fg-mute)] font-mono">
          —
        </td>
        <td className="py-1.5 text-right text-[var(--fg-mute)] font-mono">
          —
        </td>
      </tr>
    );
  }
  return (
    <tr className="border-t border-[var(--border-soft)]">
      <td className="py-1.5 text-[var(--accent-primary)] font-mono">{name}</td>
      <td className="py-1.5 text-right text-[var(--accent-up)] font-semibold font-mono tabular-nums">
        {fmtPct(quote.yesPrice)}
      </td>
      <td className="py-1.5 text-right text-[var(--accent-down)] font-semibold font-mono tabular-nums">
        {fmtPct(quote.noPrice)}
      </td>
      <td className="py-1.5 text-right font-mono tabular-nums">
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
          className="text-[var(--accent-primary)] hover:underline font-mono text-[10px]"
        >
          OPEN ↗
        </a>
      </td>
    </tr>
  );
}
