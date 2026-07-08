"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Level = { price: number; size: number };
type Book = { bids: Level[]; asks: Level[]; timestamp: number };

const POLL_INTERVAL_MS = 8000;
const VISIBLE_LEVELS = 10; // shown in the L2 ladder
const DEPTH_LEVELS = 25; // included in the depth mountain chart

/**
 * Polymarket order book panel. L2 ladder on top (bids left / asks right),
 * cumulative depth mountain chart below. Polls the /api/book proxy every
 * ~8 seconds. Kalshi book is auth-gated by KYC — not yet available.
 */
export function OrderBook({ tokenId }: { tokenId: string | null }) {
  const [book, setBook] = useState<Book | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());

  // Poll the book
  const load = useCallback(
    async (signal: AbortSignal) => {
      if (!tokenId) return;
      setLoading(true);
      try {
        const res = await fetch(
          `/api/book?tokenId=${encodeURIComponent(tokenId)}`,
          { signal },
        );
        if (!res.ok) throw new Error(`book feed returned ${res.status}`);
        const data = (await res.json()) as Book;
        if (signal.aborted) return;
        setBook(data);
        setFetchedAt(Date.now());
        setError(null);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setError(e instanceof Error ? e.message : "book feed error");
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [tokenId],
  );

  useEffect(() => {
    if (!tokenId) return;
    const ctrl = new AbortController();
    load(ctrl.signal);
    const id = setInterval(() => load(ctrl.signal), POLL_INTERVAL_MS);
    return () => {
      ctrl.abort();
      clearInterval(id);
    };
  }, [tokenId, load]);

  // Tick 1x/sec so the "updated Ns ago" pill stays fresh
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const derived = useMemo(() => {
    if (!book) return null;
    const bestBid = book.bids[0]?.price ?? null;
    const bestAsk = book.asks[0]?.price ?? null;
    const spread =
      bestBid !== null && bestAsk !== null ? bestAsk - bestBid : null;
    const mid =
      bestBid !== null && bestAsk !== null ? (bestBid + bestAsk) / 2 : null;

    // Cumulative depth arrays (shares)
    let cum = 0;
    const cumBids = book.bids.slice(0, DEPTH_LEVELS).map((l) => {
      cum += l.size;
      return { price: l.price, cum };
    });
    cum = 0;
    const cumAsks = book.asks.slice(0, DEPTH_LEVELS).map((l) => {
      cum += l.size;
      return { price: l.price, cum };
    });

    return {
      bestBid,
      bestAsk,
      spread,
      mid,
      cumBids,
      cumAsks,
      bidTotal: book.bids
        .slice(0, VISIBLE_LEVELS)
        .reduce((a, l) => a + l.size, 0),
      askTotal: book.asks
        .slice(0, VISIBLE_LEVELS)
        .reduce((a, l) => a + l.size, 0),
    };
  }, [book]);

  if (!tokenId) {
    return (
      <div className="border border-[var(--border)] bg-[var(--bg)] h-24 flex items-center justify-center text-[var(--fg-mute)] text-[11px] font-mono tracking-wider">
        NO POLYMARKET TOKEN — ORDER BOOK UNAVAILABLE
      </div>
    );
  }

  const ageSec =
    fetchedAt !== null ? Math.max(0, Math.floor((nowTick - fetchedAt) / 1000)) : null;

  return (
    <div>
      {/* Header — best bid / best ask / spread + freshness */}
      <div className="flex items-center justify-between gap-2 mb-2 font-mono text-[10px] tracking-[0.12em]">
        <div className="flex items-center gap-3 tabular-nums">
          <span className="text-[var(--fg-mute)]">
            BID{" "}
            <span className="text-[var(--accent-up)] font-semibold">
              {derived?.bestBid !== null && derived?.bestBid !== undefined
                ? `${(derived.bestBid * 100).toFixed(2)}%`
                : "—"}
            </span>
          </span>
          <span className="text-[var(--fg-mute)]">
            ASK{" "}
            <span className="text-[var(--accent-down)] font-semibold">
              {derived?.bestAsk !== null && derived?.bestAsk !== undefined
                ? `${(derived.bestAsk * 100).toFixed(2)}%`
                : "—"}
            </span>
          </span>
          <span className="text-[var(--fg-mute)]">
            SPREAD{" "}
            <span className="text-[var(--accent-primary)] font-semibold">
              {derived?.spread !== null && derived?.spread !== undefined
                ? `${(derived.spread * 100).toFixed(2)}pp`
                : "—"}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-[var(--fg-mute)]">
          {loading && <span className="live-dot" />}
          <span>
            {ageSec !== null ? `${ageSec}s ago` : ""}
          </span>
        </div>
      </div>

      {error && !book ? (
        <div className="border border-[var(--border)] bg-[var(--bg)] h-24 flex items-center justify-center text-[var(--accent-down)] text-[11px] font-mono tracking-wider">
          FEED ERROR · {error}
        </div>
      ) : !book && loading ? (
        <div className="border border-[var(--border)] bg-[var(--bg)] h-24 flex items-center justify-center text-[var(--fg-dim)] text-[11px] font-mono tracking-wider">
          LOADING…
        </div>
      ) : !book ||
        (book.bids.length === 0 && book.asks.length === 0) ? (
        <div className="border border-[var(--border)] bg-[var(--bg)] h-24 flex items-center justify-center text-[var(--fg-mute)] text-[11px] font-mono tracking-wider">
          NO OPEN ORDERS
        </div>
      ) : (
        <>
          <Ladder book={book} derived={derived!} />
          <div className="mt-2">
            <DepthChart derived={derived!} />
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// L2 ladder (bids left / asks right)
// ─────────────────────────────────────────────────────────────────────────────

function Ladder({
  book,
  derived,
}: {
  book: Book;
  derived: {
    bidTotal: number;
    askTotal: number;
  };
}) {
  const bids = book.bids.slice(0, VISIBLE_LEVELS);
  const asks = book.asks.slice(0, VISIBLE_LEVELS);
  const rowCount = Math.max(bids.length, asks.length);
  const maxSize = Math.max(
    1,
    ...bids.map((b) => b.size),
    ...asks.map((a) => a.size),
  );

  // Cumulative arrays for the CUM column
  let cb = 0;
  const cumBids = bids.map((b) => {
    cb += b.size;
    return cb;
  });
  let ca = 0;
  const cumAsks = asks.map((a) => {
    ca += a.size;
    return ca;
  });

  return (
    <div className="border border-[var(--border)] bg-[var(--bg)]">
      <div className="grid grid-cols-2 divide-x divide-[var(--border)]">
        {/* BID side */}
        <div>
          <BookHeader side="bid" />
          <div className="text-[11px] font-mono tabular-nums">
            {Array.from({ length: rowCount }).map((_, i) => {
              const b = bids[i];
              if (!b)
                return (
                  <div key={`b-${i}`} className="h-[18px]" />
                );
              const bar = (b.size / maxSize) * 100;
              return (
                <div
                  key={`b-${i}`}
                  className="relative h-[18px] flex items-center px-2 gap-2 border-t border-[var(--border-soft)]"
                >
                  <div
                    aria-hidden
                    className="absolute inset-y-0 right-0 bg-[var(--accent-up)] opacity-[0.09]"
                    style={{ width: `${bar}%` }}
                  />
                  <div className="relative w-16 text-[var(--fg-mute)] text-right">
                    {fmtShares(cumBids[i])}
                  </div>
                  <div className="relative flex-1 text-[var(--fg)] text-right">
                    {fmtShares(b.size)}
                  </div>
                  <div className="relative w-14 text-[var(--accent-up)] font-semibold text-right">
                    {(b.price * 100).toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ASK side */}
        <div>
          <BookHeader side="ask" />
          <div className="text-[11px] font-mono tabular-nums">
            {Array.from({ length: rowCount }).map((_, i) => {
              const a = asks[i];
              if (!a)
                return (
                  <div key={`a-${i}`} className="h-[18px]" />
                );
              const bar = (a.size / maxSize) * 100;
              return (
                <div
                  key={`a-${i}`}
                  className="relative h-[18px] flex items-center px-2 gap-2 border-t border-[var(--border-soft)]"
                >
                  <div
                    aria-hidden
                    className="absolute inset-y-0 left-0 bg-[var(--accent-down)] opacity-[0.09]"
                    style={{ width: `${bar}%` }}
                  />
                  <div className="relative w-14 text-[var(--accent-down)] font-semibold text-left">
                    {(a.price * 100).toFixed(2)}
                  </div>
                  <div className="relative flex-1 text-[var(--fg)] text-left">
                    {fmtShares(a.size)}
                  </div>
                  <div className="relative w-16 text-[var(--fg-mute)] text-left">
                    {fmtShares(cumAsks[i])}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Totals row */}
      <div className="grid grid-cols-2 divide-x divide-[var(--border)] border-t border-[var(--border)] font-mono text-[10px] tabular-nums">
        <div className="px-2 py-1 flex items-center justify-between">
          <span className="text-[var(--fg-mute)] tracking-wider">
            BID TOTAL
          </span>
          <span className="text-[var(--accent-up)] font-semibold">
            {fmtShares(derived.bidTotal)}
          </span>
        </div>
        <div className="px-2 py-1 flex items-center justify-between">
          <span className="text-[var(--fg-mute)] tracking-wider">
            ASK TOTAL
          </span>
          <span className="text-[var(--accent-down)] font-semibold">
            {fmtShares(derived.askTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}

function BookHeader({ side }: { side: "bid" | "ask" }) {
  return (
    <div className="flex items-center px-2 py-1 border-b border-[var(--border)] bg-[var(--bg-elev)] font-mono text-[9px] tracking-[0.14em] text-[var(--fg-mute)]">
      {side === "bid" ? (
        <>
          <div className="w-16 text-right">CUM</div>
          <div className="flex-1 text-right">SIZE</div>
          <div className="w-14 text-right">BID</div>
        </>
      ) : (
        <>
          <div className="w-14 text-left">ASK</div>
          <div className="flex-1 text-left">SIZE</div>
          <div className="w-16 text-left">CUM</div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Depth mountain chart (SVG)
// ─────────────────────────────────────────────────────────────────────────────

const W = 700;
const H = 120;
const PAD_L = 6;
const PAD_R = 6;
const PAD_T = 10;
const PAD_B = 20;

function DepthChart({
  derived,
}: {
  derived: {
    cumBids: Array<{ price: number; cum: number }>;
    cumAsks: Array<{ price: number; cum: number }>;
    mid: number | null;
  };
}) {
  const { cumBids, cumAsks, mid } = derived;
  if (cumBids.length === 0 && cumAsks.length === 0) return null;

  // Price range: from worst bid to worst ask (or fallback if only one side)
  const lo =
    cumBids.length > 0 ? cumBids[cumBids.length - 1].price : (mid ?? 0) - 0.05;
  const hi =
    cumAsks.length > 0 ? cumAsks[cumAsks.length - 1].price : (mid ?? 0) + 0.05;
  const priceSpan = Math.max(0.001, hi - lo);

  const maxCum = Math.max(
    1,
    cumBids[cumBids.length - 1]?.cum ?? 0,
    cumAsks[cumAsks.length - 1]?.cum ?? 0,
  );

  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const xOf = (price: number) =>
    PAD_L + ((price - lo) / priceSpan) * innerW;
  const yOf = (cum: number) => PAD_T + (1 - cum / maxCum) * innerH;

  // Build stair-step (order-book style) paths — flat-then-drop at each level.
  // For bids: walk from best bid downward; step function of cumulative size.
  const bidPathParts: string[] = [];
  if (cumBids.length > 0) {
    // Start at best bid at cum=0 (top), then drop to first level's cum, then walk left.
    const first = cumBids[0];
    bidPathParts.push(`M ${xOf(first.price).toFixed(1)} ${yOf(0).toFixed(1)}`);
    let prevY = yOf(0);
    for (const lvl of cumBids) {
      const x = xOf(lvl.price);
      const y = yOf(lvl.cum);
      bidPathParts.push(`L ${x.toFixed(1)} ${prevY.toFixed(1)}`);
      bidPathParts.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
      prevY = y;
    }
  }
  const bidLinePath = bidPathParts.join(" ");
  const bidAreaPath =
    bidPathParts.length > 0
      ? `${bidLinePath} L ${xOf(cumBids[cumBids.length - 1].price).toFixed(1)} ${yOf(0).toFixed(1)} Z`
      : "";

  const askPathParts: string[] = [];
  if (cumAsks.length > 0) {
    const first = cumAsks[0];
    askPathParts.push(`M ${xOf(first.price).toFixed(1)} ${yOf(0).toFixed(1)}`);
    let prevY = yOf(0);
    for (const lvl of cumAsks) {
      const x = xOf(lvl.price);
      const y = yOf(lvl.cum);
      askPathParts.push(`L ${x.toFixed(1)} ${prevY.toFixed(1)}`);
      askPathParts.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
      prevY = y;
    }
  }
  const askLinePath = askPathParts.join(" ");
  const askAreaPath =
    askPathParts.length > 0
      ? `${askLinePath} L ${xOf(cumAsks[cumAsks.length - 1].price).toFixed(1)} ${yOf(0).toFixed(1)} Z`
      : "";

  // Axis labels at low / mid / high
  const midX = mid !== null ? xOf(mid) : null;

  return (
    <div className="border border-[var(--border)] bg-[var(--bg)]">
      <div className="px-2 py-1 border-b border-[var(--border)] bg-[var(--bg-elev)] font-mono text-[9px] tracking-[0.14em] text-[var(--fg-mute)] flex items-center justify-between">
        <span>DEPTH (CUMULATIVE SHARES)</span>
        <span>SHARES @ MID{mid !== null ? ` ${(mid * 100).toFixed(2)}%` : ""}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block w-full"
        style={{ height: H }}
      >
        {/* Bid area */}
        {bidAreaPath && (
          <path d={bidAreaPath} fill="var(--accent-up)" opacity={0.15} />
        )}
        {bidLinePath && (
          <path
            d={bidLinePath}
            fill="none"
            stroke="var(--accent-up)"
            strokeWidth={1.2}
          />
        )}
        {/* Ask area */}
        {askAreaPath && (
          <path d={askAreaPath} fill="var(--accent-down)" opacity={0.15} />
        )}
        {askLinePath && (
          <path
            d={askLinePath}
            fill="none"
            stroke="var(--accent-down)"
            strokeWidth={1.2}
          />
        )}
        {/* Mid line */}
        {midX !== null && (
          <line
            x1={midX}
            x2={midX}
            y1={PAD_T}
            y2={PAD_T + innerH}
            stroke="var(--accent-primary)"
            strokeWidth={0.8}
            strokeDasharray="3 3"
          />
        )}
        {/* X-axis labels */}
        <text
          x={PAD_L}
          y={H - 5}
          fontSize={9}
          fontFamily="var(--font-mono)"
          fill="var(--fg-mute)"
        >
          {(lo * 100).toFixed(1)}%
        </text>
        {midX !== null && (
          <text
            x={midX}
            y={H - 5}
            fontSize={9}
            fontFamily="var(--font-mono)"
            fill="var(--accent-primary)"
            textAnchor="middle"
          >
            {(mid! * 100).toFixed(2)}%
          </text>
        )}
        <text
          x={W - PAD_R}
          y={H - 5}
          fontSize={9}
          fontFamily="var(--font-mono)"
          fill="var(--fg-mute)"
          textAnchor="end"
        >
          {(hi * 100).toFixed(1)}%
        </text>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtShares(v: number): string {
  if (!Number.isFinite(v)) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 10_000) return `${(v / 1_000).toFixed(1)}K`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(2)}K`;
  return v.toFixed(0);
}
