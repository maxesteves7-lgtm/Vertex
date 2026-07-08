"use client";

import { useEffect, useState } from "react";
import { markTourSeen } from "@/lib/onboarding";

type Slide = {
  title: string;
  body: React.ReactNode;
  /** ASCII/box "diagram" of the region being described — terminal aesthetic
   *  in place of screenshots. */
  visual?: React.ReactNode;
};

/**
 * First-run tour for the terminal. 7 slides, keyboard-navigable (← / →),
 * dismissible. "Never show again" writes the seen flag; ordinary skip
 * doesn't (so the tour returns next time). Reopens on demand from the
 * home-view header button.
 */
export function OnboardingTour({ onClose }: { onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const [neverShow, setNeverShow] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(false);
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, neverShow]);

  function next() {
    if (idx < SLIDES.length - 1) setIdx((i) => i + 1);
    else close(neverShow);
  }
  function prev() {
    if (idx > 0) setIdx((i) => i - 1);
  }
  function close(persist: boolean) {
    if (persist) markTourSeen();
    onClose();
  }

  const slide = SLIDES[idx];
  const isLast = idx === SLIDES.length - 1;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/80 z-40"
        onClick={() => close(false)}
        aria-hidden
      />
      <div
        role="dialog"
        aria-label="Terminal primer"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] max-w-[94vw] max-h-[90vh] overflow-auto bg-[var(--bg-elev)] border border-[var(--border)] rounded-sm z-50"
      >
        {/* Header — slide meta */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--bg)]">
          <div className="font-mono text-[10px] tracking-[0.18em] text-[var(--fg-mute)]">
            TERMINAL PRIMER · {idx + 1} OF {SLIDES.length}
          </div>
          <button
            onClick={() => close(false)}
            className="font-mono text-[10px] tracking-[0.14em] text-[var(--fg-mute)] hover:text-white"
          >
            SKIP ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <h2 className="font-mono text-[14px] tracking-[0.14em] text-[var(--accent-primary)] mb-3">
            {slide.title}
          </h2>

          {slide.visual && (
            <div className="mb-4 border border-[var(--border-soft)] rounded-sm bg-[var(--bg)] p-3 font-mono text-[10px] leading-[1.5] text-[var(--fg-dim)] whitespace-pre overflow-x-auto">
              {slide.visual}
            </div>
          )}

          <div className="text-[13px] text-[var(--fg)] leading-relaxed space-y-2">
            {slide.body}
          </div>
        </div>

        {/* Footer — progress dots + nav */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-[var(--border)] bg-[var(--bg)]">
          <div className="flex items-center gap-1.5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Slide ${i + 1}`}
                className={`w-[7px] h-[7px] rounded-full transition-colors ${
                  i === idx
                    ? "bg-[var(--accent-primary)]"
                    : "bg-[var(--border)] hover:bg-[var(--fg-mute)]"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {isLast && (
              <label className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] text-[var(--fg-mute)] mr-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={neverShow}
                  onChange={(e) => setNeverShow(e.target.checked)}
                  className="accent-[var(--accent-primary)]"
                />
                NEVER SHOW AGAIN
              </label>
            )}
            <button
              onClick={prev}
              disabled={idx === 0}
              className="px-3 py-1.5 border border-[var(--border)] rounded-sm font-mono text-[10px] tracking-[0.14em] text-[var(--fg-dim)] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← BACK
            </button>
            <button
              onClick={next}
              className="px-3 py-1.5 rounded-sm font-mono text-[10px] tracking-[0.14em] bg-[var(--accent-primary)] text-black hover:opacity-90"
            >
              {isLast ? "DONE →" : "NEXT →"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Slides
// ─────────────────────────────────────────────────────────────────────────────

const kbd = (label: string) => (
  <kbd className="inline-block px-1.5 py-0.5 rounded bg-[var(--bg-row)] border border-[var(--border)] text-[var(--fg-dim)] text-[11px] font-mono">
    {label}
  </kbd>
);

const SLIDES: Slide[] = [
  {
    title: "WELCOME TO FUTURIST",
    body: (
      <>
        <p>
          An institutional-grade prediction market terminal. Every active
          Polymarket and Kalshi event, unified. Real ρ correlation, a live
          FRED macro strip, an order book, OHLC price charts — everything a
          serious trader wants on one screen.
        </p>
        <p className="text-[var(--fg-dim)] text-[12px]">
          Keyboard-first, Bloomberg-styled. Takes about 60 seconds to walk
          through — hit {kbd("→")} or NEXT to continue.
        </p>
      </>
    ),
    visual: `┌──────────────────────────────────────────────────────┐
│  ▍ FUTURIST     SCANNER   FLOW   HEATMAP   NEWS      │
│  MACRO   FED FUNDS  CPI YoY  10Y  VIX  USD  · FRED   │
├────────┬──────────────────────────────────┬──────────┤
│  MENU  │        SCANNER  /  CARDS         │  DETAIL  │
│        │                                  │  PANE    │
│        ├──────────────────────────────────┤          │
│        │  MOVERS · CLOSING · NEWS         │          │
└────────┴──────────────────────────────────┴──────────┘`,
  },
  {
    title: "THE SCANNER",
    body: (
      <>
        <p>
          Every market lives in the center panel. Two view modes:
          <br />
          {kbd("1")} SCANNER — dense sortable table (Bloomberg feel).
          <br />
          {kbd("2")} CARDS — grid of clickable cards.
        </p>
        <p>
          Click any column header in Scanner to sort. Click any row to load
          its full detail on the right. {kbd("↓ CSV")} exports the current
          view.
        </p>
      </>
    ),
    visual: `EVENT                              SRC  CAT   YES  NO   Δ24H
Will USA win 2026 World Cup?      BOTH  SPRT  28%  72%  +2.1
Will Trump pardon...              POLY  POL   61%  39%  -0.4
BTC above $150k by Dec 31?        BOTH  CRP   43%  57%  +1.8
                                                        ...`,
  },
  {
    title: "THE SIDEBAR",
    body: (
      <>
        <p>
          Three sections on the left:
        </p>
        <p>
          <strong>DISCOVER</strong> — All Markets, Market Movers, Closing
          Soon, Watchlist.
        </p>
        <p>
          <strong>MY SCREENERS</strong> — Save up to 5 custom filter
          presets (source + category + volume + closing date + price range).
        </p>
        <p>
          <strong>CATEGORIES</strong> — Politics, Sports, Finance, Crypto,
          Science &amp; Tech, Entertainment, Weather, Health. Click the
          chevron to drill into subcategories.
        </p>
      </>
    ),
  },
  {
    title: "DETAIL PANE",
    body: (
      <>
        <p>
          Everything about a selected market:
        </p>
        <p>
          <strong>Quotes</strong> — per-exchange YES/NO/volume and the
          cross-exchange spread.
          <br />
          <strong>Order Book</strong> — live Polymarket L2 ladder + depth
          mountain chart, refreshed every 8s.
          <br />
          <strong>Price History</strong> — LINE or OHLC chart with crosshair
          tooltip and 1H/1D/1W/1M/ALL windows.
          <br />
          <strong>Correlated Markets</strong> — Pearson ρ vs the top-30
          same-category peers.
          <br />
          <strong>Alerts, News, Trades, Stats</strong> — everything else.
        </p>
      </>
    ),
  },
  {
    title: "WATCHLIST & CONTEXT MENU",
    body: (
      <>
        <p>
          Star any market to add it to your watchlist (or hit {kbd("f")} on
          the highlighted card). In Cards view, drag cards to reorder.
        </p>
        <p>
          <strong>Right-click</strong> any row or card for a quick menu:
          Open, Add/Remove favorite, Copy exchange URL, Copy question, Set
          price alert.
        </p>
      </>
    ),
    visual: `★ Watchlist (drag to reorder)
  ┌────────────────────────────────────┐
  │ ↑ ↓  Trump pardons someone by...   │  ← right-click
  ├────────────────────────────────────┤
  │      BTC above $150k by Dec 31?    │       ↓
  ├────────────────────────────────────┤   ┌───────────────────┐
  │      Fed cuts rates in Jun 2026?   │   │ → Open detail  ⏎  │
  └────────────────────────────────────┘   │ ★ Favorite     f  │
                                            │ ⧉ Copy URL        │
                                            │ ! Set price alert │
                                            └───────────────────┘`,
  },
  {
    title: "ALERTS & NOTIFICATIONS",
    body: (
      <>
        <p>
          Open any market → Alerts section → pick a direction (YES ≥ or ≤)
          and a threshold %. Choose IN-APP or EMAIL delivery.
        </p>
        <p>
          Fired alerts land in the bell in the top-right (
          <span className="text-[var(--accent-primary)]">◔</span>). Click to
          see recent items, mark them read, or jump to the exchange.
        </p>
        <p className="text-[var(--fg-dim)] text-[12px]">
          The check cron runs once daily on Vercel Hobby. Upgrade the plan
          later and it can go to every-few-minutes with zero code changes.
        </p>
      </>
    ),
  },
  {
    title: "KEYBOARD SHORTCUTS",
    body: (
      <>
        <p>
          The terminal is designed keyboard-first. Learn these five and
          you'll never touch the mouse again:
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2 text-[12px]">
          <div>{kbd("/")} Focus search</div>
          <div>{kbd("j")}/{kbd("k")} Move highlight</div>
          <div>{kbd("⏎")} Open highlighted</div>
          <div>{kbd("f")} Favorite highlighted</div>
          <div>{kbd("1")}/{kbd("2")} Scanner / Cards</div>
          <div>{kbd(":")} Command bar</div>
          <div>{kbd("?")} Full shortcut list</div>
          <div>{kbd("Esc")} Close anything</div>
        </div>
        <p className="text-[var(--fg-dim)] text-[12px] mt-3">
          You're set. Check &quot;NEVER SHOW AGAIN&quot; if you don't want
          this primer on next visit. You can always reopen it from the TOUR
          button next to the ? in the home header.
        </p>
      </>
    ),
  },
];
