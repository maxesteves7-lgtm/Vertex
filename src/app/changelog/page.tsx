import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog // Futurist",
  description: "What&rsquo;s new in Futurist. Latest changes at the top.",
};

/**
 * Static changelog. Keep entries short — a few bullets per release. Newest
 * on top. Categorize each bullet with a tiny tag (NEW / FIX / IMPROVED).
 */
type Entry = {
  version: string;
  date: string; // YYYY-MM-DD
  bullets: Array<{ tag: "NEW" | "FIX" | "IMPROVED"; text: string }>;
};

const ENTRIES: Entry[] = [
  {
    version: "v0.7",
    date: "2026-08-08",
    bullets: [
      { tag: "NEW", text: "Team seats for Institutional — invite up to 4 teammates who inherit your tier." },
      { tag: "NEW", text: "Product analytics (PostHog) + error tracking (Sentry) wired up." },
      { tag: "NEW", text: "Legal pages: Terms, Privacy, Cookie Policy." },
      { tag: "FIX", text: "Institutional users no longer blocked from Pro-tier features by a stale client cache." },
      { tag: "FIX", text: "Stripe Checkout locks the customer email so autofill / Link can&rsquo;t hijack the subscription." },
      { tag: "FIX", text: "Subscription trial-end date now reads from Stripe correctly (was showing today for new trials)." },
    ],
  },
  {
    version: "v0.6",
    date: "2026-07-14",
    bullets: [
      { tag: "NEW", text: "Paywall gating across Order Flow, Heatmap, Scanner cap, CSV export, alerts." },
      { tag: "NEW", text: "Programmatic API access + key management for Institutional." },
      { tag: "NEW", text: "Trial reminder email on day 12." },
      { tag: "IMPROVED", text: "Daily AI Overview usage tracking to make quota enforcement possible later." },
    ],
  },
  {
    version: "v0.5",
    date: "2026-06-30",
    bullets: [
      { tag: "NEW", text: "Accounts (email + password, Google OAuth) via Supabase." },
      { tag: "NEW", text: "Subscriptions (Free / Pro / Institutional) via Stripe." },
      { tag: "NEW", text: "Pricing page, account settings, subscription management via Stripe portal." },
    ],
  },
  {
    version: "v0.4",
    date: "2026-05-22",
    bullets: [
      { tag: "NEW", text: "AI Overview — quick news-grounded summary per market." },
      { tag: "NEW", text: "News Wire with per-market relevance tagging." },
      { tag: "NEW", text: "Filter drawer with saved presets." },
      { tag: "NEW", text: "Cookie consent banner + risk-disclosure and data-sources pages." },
    ],
  },
  {
    version: "v0.3",
    date: "2026-04-10",
    bullets: [
      { tag: "NEW", text: "Correlation heatmap — daily backfill + explorer view." },
      { tag: "NEW", text: "Macro ticker across the top (FRED series)." },
      { tag: "NEW", text: "Light-mode theme with anti-flash boot script." },
      { tag: "IMPROVED", text: "Onboarding tour on first visit." },
    ],
  },
  {
    version: "v0.2",
    date: "2026-03-05",
    bullets: [
      { tag: "NEW", text: "Cockpit shell — resizable three-panel layout." },
      { tag: "NEW", text: "OHLC candlestick chart with crosshair + activity bars." },
      { tag: "NEW", text: "Order book depth chart + L2 table." },
      { tag: "NEW", text: "Correlated markets sidebar." },
      { tag: "NEW", text: "In-app notifications + notification bell." },
    ],
  },
  {
    version: "v0.1",
    date: "2026-01-18",
    bullets: [
      { tag: "NEW", text: "Cross-exchange screener (Polymarket + Kalshi) with categorization." },
      { tag: "NEW", text: "Scanner view + CSV export." },
      { tag: "NEW", text: "Watchlist / favorites (localStorage)." },
      { tag: "NEW", text: "Bloomberg-inspired terminal aesthetic (IBM Plex Mono + orange accents)." },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <main className="flex-1 flex flex-col min-h-[calc(100vh-56px)]">
      <article className="max-w-3xl mx-auto w-full px-6 py-10 text-[14px] leading-relaxed text-[var(--fg-dim)]">
        <header className="mb-10">
          <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--fg-mute)] mb-2">
            FUTURIST
          </div>
          <h1 className="text-[28px] font-semibold text-[var(--fg)] tracking-tight">
            Changelog
          </h1>
          <p className="text-[14px] text-[var(--fg-dim)] mt-2">
            Everything shipped, newest on top. Bug fixes and quality-of-life
            polish that don&rsquo;t change behavior aren&rsquo;t always
            listed.
          </p>
        </header>

        <div className="space-y-10">
          {ENTRIES.map((e) => (
            <section key={e.version}>
              <div className="flex items-baseline gap-3 mb-3 border-b border-[var(--border)] pb-2">
                <h2 className="font-mono text-[18px] text-[var(--fg)] tracking-tight">
                  {e.version}
                </h2>
                <span className="font-mono text-[11px] text-[var(--fg-mute)] tracking-[0.14em]">
                  {e.date}
                </span>
              </div>
              <ul className="space-y-2">
                {e.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <TagPill tag={b.tag} />
                    <span className="text-[14px] text-[var(--fg-dim)] leading-relaxed flex-1">
                      {b.text}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="mt-12 font-mono text-[10px] tracking-[0.14em] text-[var(--fg-mute)]">
          Want to suggest a change? Email us via the contact page.
        </p>
      </article>
    </main>
  );
}

function TagPill({ tag }: { tag: Entry["bullets"][number]["tag"] }) {
  const style =
    tag === "NEW"
      ? "text-[var(--accent-primary)] border-[var(--accent-primary)]"
      : tag === "FIX"
        ? "text-[var(--accent-down)] border-[var(--accent-down)]/60"
        : "text-[var(--fg-mute)] border-[var(--border)]";
  return (
    <span
      className={`inline-block shrink-0 mt-[3px] px-1.5 py-[1px] font-mono text-[9px] tracking-[0.14em] border rounded-sm ${style}`}
    >
      {tag}
    </span>
  );
}
