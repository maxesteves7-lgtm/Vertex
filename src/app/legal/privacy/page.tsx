import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy // Futurist",
  description:
    "How Futurist collects, uses, and protects your personal information.",
};

/**
 * Privacy Policy — plain-English draft. Written to accurately describe the
 * data flows Futurist actually has: Supabase Auth, Neon Postgres, Stripe,
 * PostHog analytics, Sentry error tracking, Google Gemini for AI Overview,
 * Resend for transactional email. Have a lawyer review before relying on
 * this commercially, especially if you have EU/UK/California users.
 */
export default function PrivacyPage() {
  return (
    <main className="flex-1 flex flex-col min-h-[calc(100vh-56px)]">
      <article className="max-w-3xl mx-auto w-full px-6 py-10 text-[14px] leading-relaxed text-[var(--fg-dim)]">
        <header className="mb-8">
          <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--fg-mute)] mb-2">
            LEGAL
          </div>
          <h1 className="text-[28px] font-semibold text-[var(--fg)] tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-[12px] text-[var(--fg-mute)] mt-2 font-mono">
            Last updated: 2026-08-08
          </p>
        </header>

        <Section title="1. Who we are">
          <p>
            Futurist (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or
            &ldquo;our&rdquo;) is a prediction-market data terminal. This
            policy describes what personal information we collect about you,
            why we collect it, who we share it with, and the choices you
            have.
          </p>
        </Section>

        <Section title="2. Information you give us">
          <p>
            When you create an account, subscribe, or interact with
            features, you may provide:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Account:</strong> email address and a password (stored
              hashed by our auth provider).
            </li>
            <li>
              <strong>Billing:</strong> payment information you submit to
              our payment processor. We do not see or store full card
              numbers; only limited metadata (last-4, brand, expiry) is
              made available to us for display purposes.
            </li>
            <li>
              <strong>Content you create:</strong> watchlists, saved
              screeners, alert rules, team invites, and API key labels.
            </li>
            <li>
              <strong>Support & correspondence:</strong> messages you send
              us.
            </li>
          </ul>
        </Section>

        <Section title="3. Information collected automatically">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Usage data:</strong> pages viewed, features used,
              feature-gate hits, and timestamps. Used to improve the
              product.
            </li>
            <li>
              <strong>Device data:</strong> browser type, operating system,
              screen size, referring URL, general geographic region derived
              from IP.
            </li>
            <li>
              <strong>Error data:</strong> stack traces and metadata when
              something in the app crashes for you.
            </li>
            <li>
              <strong>Cookies & local storage:</strong> see our{" "}
              <a
                href="/legal/cookies"
                className="underline hover:text-[var(--accent-primary)]"
              >
                Cookie Policy
              </a>
              .
            </li>
          </ul>
        </Section>

        <Section title="4. How we use your information">
          <ul className="list-disc pl-5 space-y-1">
            <li>To provide and operate the Service.</li>
            <li>To process subscriptions, invoices, and refunds.</li>
            <li>
              To send account-related email (invitations, alert
              notifications, trial reminders, security notices). We do not
              send marketing email without your consent.
            </li>
            <li>
              To detect abuse, enforce our{" "}
              <a
                href="/legal/terms"
                className="underline hover:text-[var(--accent-primary)]"
              >
                Terms
              </a>
              , and secure the Service.
            </li>
            <li>
              To improve features by analyzing aggregated usage patterns.
            </li>
            <li>To comply with legal obligations.</li>
          </ul>
        </Section>

        <Section title="5. Third-party service providers">
          <p>
            We rely on a small set of vendors to run the Service. Each
            handles a narrow slice of your data:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Supabase</strong> — authentication (email + password
              hash, session tokens).
            </li>
            <li>
              <strong>Neon</strong> — Postgres database hosting for
              application data (watchlists, alerts, subscriptions, teams).
            </li>
            <li>
              <strong>Vercel</strong> — application hosting and edge
              network. Receives request metadata to serve pages.
            </li>
            <li>
              <strong>Stripe</strong> — subscription billing and payment
              method storage. Governed by Stripe&rsquo;s privacy policy.
            </li>
            <li>
              <strong>PostHog</strong> — product analytics (page views,
              custom events). We identify events with your email so we can
              debug user-specific issues you report.
            </li>
            <li>
              <strong>Sentry</strong> — error tracking. Receives stack
              traces and, in some cases, the URL and email of the affected
              user.
            </li>
            <li>
              <strong>Resend</strong> — transactional email delivery
              (alerts, team invites, trial reminders).
            </li>
            <li>
              <strong>Google Gemini</strong> — powers the AI Overview
              feature. Receives the market question and category (no
              personal information).
            </li>
          </ul>
          <p>
            We do not sell your personal information. We do not share it
            with third parties for their own marketing.
          </p>
        </Section>

        <Section title="6. International transfers">
          <p>
            Our vendors are primarily located in the United States. If you
            access the Service from another country, information about you
            will be transferred to and processed in the United States.
            Standard Contractual Clauses or equivalent safeguards apply
            where required.
          </p>
        </Section>

        <Section title="7. How long we keep your data">
          <p>
            We retain account and content data for as long as your account
            is active. On account deletion, we remove your identifying
            information within 30 days from operational systems, subject to
            backups (which age out on a rolling basis) and to any legal
            obligation to retain records (e.g., tax records related to your
            subscription).
          </p>
        </Section>

        <Section title="8. Security">
          <p>
            We use commercially reasonable safeguards including
            transport-layer encryption (HTTPS), hashed authentication
            credentials, hashed API keys, and vendor-provided controls. No
            method of transmission or storage is completely secure. Notify
            us immediately if you believe your account has been
            compromised.
          </p>
        </Section>

        <Section title="9. Your rights">
          <p>
            Depending on where you live, you may have some or all of the
            following rights over your personal information:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Access — request a copy of what we hold about you.</li>
            <li>Rectification — correct information that is inaccurate.</li>
            <li>Deletion — ask us to delete your account and data.</li>
            <li>
              Portability — receive your data in a machine-readable format.
            </li>
            <li>
              Objection / restriction — ask us to stop or limit certain
              processing.
            </li>
            <li>
              Withdrawal of consent — where processing is based on your
              consent.
            </li>
          </ul>
          <p>
            To exercise any of these, delete your account from Account
            Settings or contact us via the address in Section 12. We may
            need to verify your identity before acting on a request.
          </p>
        </Section>

        <Section title="10. Children">
          <p>
            The Service is not intended for anyone under 18. We do not
            knowingly collect information from children. If we learn we
            have, we will delete it.
          </p>
        </Section>

        <Section title="11. Changes to this policy">
          <p>
            We may update this policy from time to time. Material changes
            will be signaled by updating the &ldquo;Last updated&rdquo;
            date and, where practical, an in-app notice. Continued use of
            the Service after a change indicates acceptance.
          </p>
        </Section>

        <Section title="12. Contact">
          <p>
            Questions or requests can be sent to the operator via the
            contact channel listed on the site. If no contact page has been
            published, requests may be sent to the email associated with
            your account&rsquo;s billing profile.
          </p>
        </Section>

        <p className="mt-10 font-mono text-[10px] tracking-[0.14em] text-[var(--fg-mute)]">
          This document is a plain-English draft. It is not legal advice.
          Have counsel review before relying on it commercially, especially
          if you serve users in the EU, UK, California, or other
          jurisdictions with specific privacy statutes (GDPR, UK GDPR,
          CCPA/CPRA, etc.).
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
