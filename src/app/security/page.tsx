import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security // Futurist",
  description:
    "How Futurist handles security and how to responsibly disclose vulnerabilities.",
};

const SECURITY_EMAIL =
  process.env.NEXT_PUBLIC_SECURITY_EMAIL ?? "security@futurist.terminal";

/**
 * Responsible-disclosure page. Establishes scope, safe harbor, response
 * expectations, and the reporting channel. Also lists what we already do
 * defensively so users can evaluate our security posture.
 */
export default function SecurityPage() {
  return (
    <main className="flex-1 flex flex-col min-h-[calc(100vh-56px)]">
      <article className="max-w-3xl mx-auto w-full px-6 py-10 text-[14px] leading-relaxed text-[var(--fg-dim)]">
        <header className="mb-8">
          <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--fg-mute)] mb-2">
            FUTURIST
          </div>
          <h1 className="text-[28px] font-semibold text-[var(--fg)] tracking-tight">
            Security
          </h1>
          <p className="text-[14px] text-[var(--fg-dim)] mt-2">
            Report vulnerabilities directly. Do not open a public GitHub
            issue.
          </p>
        </header>

        <Section title="Reporting a vulnerability">
          <p>
            If you believe you&rsquo;ve found a security issue in Futurist,
            please email:
          </p>
          <p>
            <a
              href={`mailto:${SECURITY_EMAIL}`}
              className="font-mono text-[13px] text-[var(--accent-primary)] hover:underline"
            >
              {SECURITY_EMAIL}
            </a>
          </p>
          <p>
            Include as much detail as you can &mdash; steps to reproduce, a
            proof-of-concept, the affected URL, and the impact you believe
            it enables. We will acknowledge receipt within 3 business days
            and follow up as we investigate.
          </p>
        </Section>

        <Section title="Safe harbor">
          <p>
            We will not pursue legal action against researchers who:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Make a good-faith effort to avoid privacy violations,
              destruction of data, and interruption of the service.
            </li>
            <li>
              Only interact with accounts they own or have explicit
              permission from the account holder to test.
            </li>
            <li>
              Do not exfiltrate data beyond the minimum necessary to
              demonstrate the vulnerability.
            </li>
            <li>
              Give us reasonable time to investigate and fix an issue
              before publicly disclosing it.
            </li>
            <li>
              Do not access, modify, or delete other users&rsquo; data.
            </li>
          </ul>
        </Section>

        <Section title="In scope">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              The application at our production domain(s) and its API
              routes.
            </li>
            <li>Authentication, authorization, and session handling.</li>
            <li>Subscription and billing logic.</li>
            <li>Team-invite and access-inheritance flows.</li>
            <li>Anything that leaks personal data or bypasses paid gating.</li>
          </ul>
        </Section>

        <Section title="Out of scope">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Vulnerabilities in third-party services we depend on
              (Supabase, Stripe, Neon, Vercel, PostHog, Sentry). Report
              those to their respective security teams.
            </li>
            <li>
              Denial-of-service or brute-force attacks against the
              production environment.
            </li>
            <li>
              Automated scanner output (SSL configuration reports, missing
              headers, etc.) without a demonstrated exploit.
            </li>
            <li>Social engineering of our team, our vendors, or our users.</li>
            <li>Physical attacks on infrastructure.</li>
            <li>
              Missing best-practice headers where they don&rsquo;t enable
              a real attack (CSP, HSTS preload, etc.). We welcome the
              report but they may not be treated as high-severity.
            </li>
          </ul>
        </Section>

        <Section title="What we do defensively">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              HTTPS enforced site-wide via Vercel&rsquo;s edge network.
            </li>
            <li>
              Authentication credentials are hashed by Supabase &mdash; we
              never see plaintext passwords.
            </li>
            <li>
              API keys are hashed (SHA-256) before being stored. The full
              key is only visible to you at the moment of creation.
            </li>
            <li>
              Payment method details are handled entirely by Stripe. Our
              servers see limited metadata (last-4, brand) only.
            </li>
            <li>
              Server-side subscription checks on every gated feature &mdash;
              client-side gates alone would be trivially bypassable.
            </li>
            <li>
              Stripe webhooks are signature-verified before we mutate
              subscription state.
            </li>
            <li>
              Team invite tokens are cryptographically random, single-use,
              and time-bounded (14 days).
            </li>
            <li>
              Error tracking via Sentry so anomalies are noticed quickly.
            </li>
          </ul>
        </Section>

        <Section title="What we intentionally have not implemented (yet)">
          <p>
            Being honest about the gaps is part of responsible disclosure.
            The following are known and on the roadmap:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Formal bug-bounty program with payouts.</li>
            <li>Two-factor authentication on user accounts.</li>
            <li>SOC 2 audit (planned as customer demand justifies).</li>
            <li>Signed responses for the public API.</li>
          </ul>
        </Section>

        <Section title="Public disclosure">
          <p>
            After a fix ships, we&rsquo;re happy to credit reporters
            publicly (with permission) in our changelog and on a
            forthcoming security acknowledgments page. Please let us know
            your preferred name / handle when reporting.
          </p>
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
