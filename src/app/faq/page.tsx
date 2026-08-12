import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ // Futurist",
  description:
    "Answers to common questions about Futurist, its data sources, features, and subscriptions.",
};

/**
 * FAQ using native <details>/<summary> — no JS, works with SSR + prerender,
 * and stays accessible. Grouped by category so it stays scannable as the
 * list grows.
 */
export default function FaqPage() {
  return (
    <main className="flex-1 flex flex-col min-h-[calc(100vh-56px)]">
      <article className="max-w-3xl mx-auto w-full px-6 py-10 text-[14px] leading-relaxed text-[var(--fg-dim)]">
        <header className="mb-10">
          <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--fg-mute)] mb-2">
            FUTURIST
          </div>
          <h1 className="text-[28px] font-semibold text-[var(--fg)] tracking-tight">
            Frequently asked questions
          </h1>
          <p className="text-[14px] text-[var(--fg-dim)] mt-2">
            If you don&rsquo;t see your question here, drop us a line via{" "}
            <Link
              href="/contact"
              className="underline hover:text-[var(--accent-primary)]"
            >
              contact
            </Link>
            .
          </p>
        </header>

        <Group title="About the product">
          <Q q="What is Futurist?">
            A Bloomberg-style terminal for prediction markets. It aggregates
            live data from Polymarket and Kalshi into a single screener,
            charting, and alerting interface. Think professional trader tool
            &mdash; dense, dark, keyboard-driven.
          </Q>
          <Q q="Does Futurist let me place trades?">
            No. Futurist is read-only market data. Trades happen on the
            venue you already use (Polymarket, Kalshi). We&rsquo;re a
            research and monitoring surface, not a broker.
          </Q>
          <Q q="Who is Futurist for?">
            Active prediction-market traders, researchers tracking policy
            and sports probabilities, and anyone who wants a single
            professional-grade view across exchanges instead of a dozen
            browser tabs.
          </Q>
          <Q q="Do you support Manifold, PredictIt, or other venues?">
            Not yet. Kalshi and Polymarket first, others as demand
            justifies. Tell us on the{" "}
            <Link
              href="/contact"
              className="underline hover:text-[var(--accent-primary)]"
            >
              contact
            </Link>{" "}
            page what you&rsquo;d prioritize.
          </Q>
        </Group>

        <Group title="Data & accuracy">
          <Q q="Where does the market data come from?">
            Directly from Polymarket&rsquo;s Gamma / Data APIs and
            Kalshi&rsquo;s public API. See the{" "}
            <Link
              href="/legal/data-sources"
              className="underline hover:text-[var(--accent-primary)]"
            >
              Data Sources
            </Link>{" "}
            page for the full list.
          </Q>
          <Q q="How fresh are the prices?">
            Screener and detail views pull on demand and show a
            &ldquo;Updated N seconds ago&rdquo; timestamp. Order book
            depths poll every few seconds while visible. Historical charts
            are cached and refreshed on load. Nothing is real-time
            streaming yet.
          </Q>
          <Q q="Can I trust the AI Overview?">
            Treat it as a starting point, not the truth. It&rsquo;s a
            language-model summary of publicly available news headlines
            fetched at request time. It can be wrong, out of date, or make
            things up. Verify before acting.
          </Q>
        </Group>

        <Group title="Subscriptions & billing">
          <Q q="What&rsquo;s free vs. paid?">
            Free covers browsing the screener, favoriting markets, and
            basic charting. Pro unlocks Order Flow, correlation heatmap,
            CSV export, alerts, and AI Overview. Institutional adds API
            access, unlimited AI usage, and team seats. See{" "}
            <Link
              href="/pricing"
              className="underline hover:text-[var(--accent-primary)]"
            >
              pricing
            </Link>{" "}
            for the current matrix.
          </Q>
          <Q q="Is there a trial?">
            Yes &mdash; 14 days on Pro and Institutional. No charge if you
            cancel before the trial ends. We remind you two days before
            billing kicks in.
          </Q>
          <Q q="How do I cancel?">
            Account → Manage Subscription → Cancel. You keep access
            through the end of the current period; we don&rsquo;t charge
            you again after that. No penalties.
          </Q>
          <Q q="Can I get a refund?">
            We don&rsquo;t prorate refunds for unused portions of a paid
            period. If something went wrong on our end (an outage, a
            billing bug), email support and we&rsquo;ll make it right.
          </Q>
        </Group>

        <Group title="Team seats">
          <Q q="How do team seats work?">
            Institutional includes up to 5 seats (owner + 4 invitees). Invite
            teammates from Account → Team. Every seat gets full Institutional
            access on your subscription &mdash; they don&rsquo;t need to add
            a card.
          </Q>
          <Q q="What if a teammate leaves?">
            Owner removes them from Account → Team. Their inherited access
            ends immediately. The freed seat can be re-invited to someone
            else.
          </Q>
          <Q q="Can I be on multiple teams?">
            Not yet. One user, one team. If that becomes important to you,
            tell us on the contact page.
          </Q>
        </Group>

        <Group title="Alerts & notifications">
          <Q q="How do alerts work?">
            Right-click any market → Set Alert → pick a threshold and
            direction. We check every minute (via a scheduled job). When
            the condition trips, you get either an in-app notification or
            an email, your choice.
          </Q>
          <Q q="Why haven&rsquo;t I gotten an email?">
            Check spam &mdash; email from new senders often lands there
            initially. Marking &ldquo;Not spam&rdquo; on the first one
            teaches your provider. If it&rsquo;s still missing after that,
            let us know.
          </Q>
        </Group>

        <Group title="Account & security">
          <Q q="Can I change my email or password?">
            Yes, from the Account page. Password changes take effect
            immediately; email changes require verifying the new address.
          </Q>
          <Q q="How do I delete my account?">
            Account → Delete Account. This wipes your identifying data
            from operational systems within 30 days. Backups age out on
            their own rolling schedule.
          </Q>
          <Q q="Is my data secure?">
            We use HTTPS everywhere, hashed passwords, hashed API keys,
            and industry-standard vendors (Supabase, Neon, Stripe). See
            the{" "}
            <Link
              href="/security"
              className="underline hover:text-[var(--accent-primary)]"
            >
              security page
            </Link>{" "}
            for full detail and how to report vulnerabilities.
          </Q>
        </Group>

        <Group title="API access">
          <Q q="How do I get an API key?">
            Institutional tier only. Account → API Keys → Generate. Keys
            are shown once at creation &mdash; store them somewhere safe
            (a password manager). We only keep a hash.
          </Q>
          <Q q="What can I do with the API?">
            Read markets, quotes, and screener data programmatically. Same
            content as the UI, machine-readable. Rate limits apply. Full
            docs will be published on the developer page as the surface
            stabilizes.
          </Q>
        </Group>
      </article>
    </main>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="font-mono text-[11px] tracking-[0.18em] uppercase text-[var(--accent-primary)] mb-4">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Q({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group border border-[var(--border)] rounded-sm bg-[var(--bg-elev)]/40">
      <summary className="cursor-pointer list-none px-4 py-3 text-[14px] text-[var(--fg)] flex items-center justify-between hover:bg-[var(--bg-row)]/40">
        <span>{q}</span>
        <span className="font-mono text-[14px] text-[var(--fg-mute)] group-open:rotate-45 transition-transform select-none">
          +
        </span>
      </summary>
      <div className="px-4 pb-4 pt-1 text-[13px] text-[var(--fg-dim)] leading-relaxed">
        {children}
      </div>
    </details>
  );
}
