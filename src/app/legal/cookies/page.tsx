import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy // Futurist",
  description:
    "The cookies and local storage Futurist uses, why, and how to control them.",
};

/**
 * Cookie Policy — plain-English draft. Enumerates the actual storage the
 * app uses today: Supabase auth cookies, PostHog analytics cookies, theme
 * localStorage, watchlist localStorage, cookie-consent flag. Have a lawyer
 * review before commercial reliance, especially for EU/UK users.
 */
export default function CookiesPage() {
  return (
    <main className="flex-1 flex flex-col min-h-[calc(100vh-56px)]">
      <article className="max-w-3xl mx-auto w-full px-6 py-10 text-[14px] leading-relaxed text-[var(--fg-dim)]">
        <header className="mb-8">
          <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--fg-mute)] mb-2">
            LEGAL
          </div>
          <h1 className="text-[28px] font-semibold text-[var(--fg)] tracking-tight">
            Cookie Policy
          </h1>
          <p className="text-[12px] text-[var(--fg-mute)] mt-2 font-mono">
            Last updated: 2026-08-08
          </p>
        </header>

        <Section title="What are cookies?">
          <p>
            Cookies are small text files a website places on your device to
            remember information between visits. &ldquo;Local storage&rdquo;
            is a similar mechanism built into your browser. This page covers
            both under the heading &ldquo;cookies&rdquo; for simplicity.
          </p>
        </Section>

        <Section title="Strictly necessary">
          <p>
            These are required for the Service to function. Disabling them
            will prevent you from signing in or using core features.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Auth session cookies</strong> — set by our
              authentication provider (Supabase) to keep you signed in. Names
              begin with <code>sb-</code>. Typical lifespan: 1 hour access
              token, 7 day refresh token.
            </li>
            <li>
              <strong>CSRF / verification cookies</strong> — set during
              sign-in and checkout to prevent cross-site request forgery.
              Session-scoped.
            </li>
            <li>
              <strong>Cookie consent flag</strong> —{" "}
              <code>vertex.cookies.v1</code> in local storage. Remembers
              your choice on the consent banner so we don&rsquo;t re-prompt.
            </li>
          </ul>
        </Section>

        <Section title="Functionality (local storage)">
          <p>
            These personalize your experience. They stay on your device and
            are not sent to us on every request.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Theme preference</strong> —{" "}
              <code>vertex.theme.v1</code>. Stores your dark/light choice so
              the site loads in your preferred theme.
            </li>
            <li>
              <strong>Watchlist / favorites</strong> —{" "}
              <code>vertex.watchlist.v2</code> and related keys. Stores your
              favorited markets locally so they persist across visits.
            </li>
            <li>
              <strong>Saved screeners</strong> —{" "}
              <code>vertex.screeners.v1</code>. Stores filter presets you
              create.
            </li>
            <li>
              <strong>Onboarding flag</strong> —{" "}
              <code>vertex.onboard.v1</code>. Tracks whether you&rsquo;ve
              seen the introductory tour.
            </li>
          </ul>
        </Section>

        <Section title="Analytics">
          <p>
            We use analytics to understand how the Service is used and to
            improve it. These cookies collect aggregated usage patterns tied
            to your account.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>PostHog</strong> — sets cookies prefixed with{" "}
              <code>ph_</code> to track sessions, page views, and custom
              events (like &ldquo;checkout_started&rdquo;). Persistent for up
              to 1 year.
            </li>
          </ul>
        </Section>

        <Section title="Error tracking">
          <p>
            We use error tracking to see when the app crashes for real
            users. It typically does not use cookies, but it may send us
            metadata about the failing request (URL, browser, and the email
            of the affected user if you were signed in).
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Sentry</strong> — captures stack traces and request
              metadata when errors occur. Session Replay of errored sessions
              is enabled at a limited sample rate.
            </li>
          </ul>
        </Section>

        <Section title="What we do not use">
          <p>
            We do not use advertising cookies, third-party marketing
            trackers, or cross-site retargeting pixels. No third party is
            paid to place cookies through the Service.
          </p>
        </Section>

        <Section title="Managing cookies">
          <p>
            You can control cookies in several ways:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Browser settings.</strong> Every modern browser lets
              you view, block, or delete cookies. Blocking all cookies will
              break sign-in.
            </li>
            <li>
              <strong>Consent banner.</strong> Adjust or revoke your consent
              via the cookie banner that appears on first visit. Clearing
              your browser storage will re-trigger the banner.
            </li>
            <li>
              <strong>Do Not Track.</strong> We honor Do Not Track by not
              loading PostHog when the browser sends it.
            </li>
          </ul>
        </Section>

        <Section title="Changes to this policy">
          <p>
            We may update this policy as the Service evolves. Material
            changes will be signaled by updating the &ldquo;Last
            updated&rdquo; date and, where practical, an in-app notice.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about cookies can be sent to the operator via the
            contact channel listed on the site. See our{" "}
            <a
              href="/legal/privacy"
              className="underline hover:text-[var(--accent-primary)]"
            >
              Privacy Policy
            </a>{" "}
            for the broader context on personal data.
          </p>
        </Section>

        <p className="mt-10 font-mono text-[10px] tracking-[0.14em] text-[var(--fg-mute)]">
          This document is a plain-English draft. It is not legal advice.
          Have counsel review before commercial reliance, especially for
          EU/UK cookie-consent obligations under ePrivacy Directive and
          GDPR.
        </p>
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
