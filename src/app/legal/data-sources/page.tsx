import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Sources // Futurist",
  description:
    "Every data feed Futurist displays, where it comes from, and how fresh it is.",
};

export default function DataSourcesPage() {
  return (
    <main className="flex-1 flex flex-col min-h-[calc(100vh-56px)]">
      <article className="max-w-3xl mx-auto w-full px-6 py-10 text-[14px] leading-relaxed text-[var(--fg-dim)]">
        <header className="mb-8">
          <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--fg-mute)] mb-2">
            LEGAL
          </div>
          <h1 className="text-[28px] font-semibold text-[var(--fg)] tracking-tight">
            Data Sources
          </h1>
          <p className="text-[12px] text-[var(--fg-mute)] mt-2 font-mono">
            Last updated: 2026-06-29
          </p>
        </header>

        <Section title="Where the market data comes from">
          <p>
            Futurist aggregates data from two public prediction-market venues
            via their unauthenticated public APIs:
          </p>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>
              <span className="text-[var(--fg)]">Polymarket</span> — market
              metadata via <span className="font-mono">gamma-api.polymarket.com</span>{" "}
              and <span className="font-mono">clob.polymarket.com</span>; order
              flow via <span className="font-mono">data-api.polymarket.com</span>.
            </li>
            <li>
              <span className="text-[var(--fg)]">Kalshi</span> — market
              metadata via <span className="font-mono">api.elections.kalshi.com</span>.
              Kalshi&apos;s order book and per-market historical price series
              require authenticated API access which is not currently wired.
            </li>
          </ul>
          <p>
            Futurist does not currently source data from any other prediction
            market, exchange, or third-party data provider for the market
            feed itself.
          </p>
        </Section>

        <Section title="Refresh frequency">
          <ul className="list-disc pl-6 space-y-1.5">
            <li>
              <span className="text-[var(--fg)]">Market feed</span> — re-fetched
              on Vercel&apos;s edge every 30 seconds; you may see stale prices
              up to 30 seconds old.
            </li>
            <li>
              <span className="text-[var(--fg)]">Order book</span> — polled by
              your browser every 8 seconds while a market&apos;s detail pane is
              open.
            </li>
            <li>
              <span className="text-[var(--fg)]">Price history charts</span> —
              cached at the edge for 60 seconds.
            </li>
            <li>
              <span className="text-[var(--fg)]">Correlation heatmap
              backfill</span> — runs once daily at 07:00 UTC and populates the
              persisted PriceObservation table.
            </li>
            <li>
              <span className="text-[var(--fg)]">Macro ticker</span> — pulled
              from the St. Louis Fed FRED API every 5 minutes.
            </li>
            <li>
              <span className="text-[var(--fg)]">News Wire &amp; AI
              Overview</span> — pulled from Google News RSS at open, cached
              per-market in your browser for 15 minutes.
            </li>
          </ul>
        </Section>

        <Section title="Data we do not have">
          <p>
            Futurist is transparent about missing data rather than
            hallucinating fields:
          </p>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>
              Kalshi 24-hour price change (paid/authenticated endpoint)
            </li>
            <li>
              Kalshi order book depth (authenticated endpoint)
            </li>
            <li>
              Kalshi per-market historical price series
            </li>
            <li>
              Any real-time streaming feed — everything is polled at the
              cadences above
            </li>
            <li>
              Any market from platforms other than Polymarket and Kalshi
            </li>
          </ul>
          <p>
            Where a value is unavailable Futurist displays{" "}
            <span className="font-mono">&quot;—&quot;</span> rather than a
            fabricated number.
          </p>
        </Section>

        <Section title="Accuracy &amp; limitations">
          <p>
            Futurist does not guarantee that the data displayed matches the
            source platforms at any given moment. Third-party APIs are
            occasionally rate-limited, temporarily unavailable, or return
            unexpected values. Before placing any trade, verify prices
            directly on the venue you intend to trade on.
          </p>
        </Section>

        <Section title="Contact the source platforms directly">
          <p>
            For authoritative market details, trade execution, and account
            management:
          </p>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>
              <a
                href="https://polymarket.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent-primary)] hover:underline"
              >
                polymarket.com
              </a>
            </li>
            <li>
              <a
                href="https://kalshi.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent-primary)] hover:underline"
              >
                kalshi.com
              </a>
            </li>
          </ul>
        </Section>
      </article>
    </main>
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
    <section className="mb-8">
      <h2 className="font-mono text-[11px] tracking-[0.18em] uppercase text-[var(--accent-primary)] mb-3">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
