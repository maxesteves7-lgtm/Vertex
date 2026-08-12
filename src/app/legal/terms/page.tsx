import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service // Futurist",
  description:
    "The terms governing your use of Futurist, a prediction-market data terminal.",
};

/**
 * Terms of Service — plain-English draft. NOT a substitute for a lawyer's
 * review before you rely on this commercially. Written to be accurate for
 * what Futurist actually is right now: a data-analytics platform with
 * subscription tiers, no order routing, no custody of funds.
 */
export default function TermsPage() {
  return (
    <main className="flex-1 flex flex-col min-h-[calc(100vh-56px)]">
      <article className="max-w-3xl mx-auto w-full px-6 py-10 text-[14px] leading-relaxed text-[var(--fg-dim)]">
        <header className="mb-8">
          <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--fg-mute)] mb-2">
            LEGAL
          </div>
          <h1 className="text-[28px] font-semibold text-[var(--fg)] tracking-tight">
            Terms of Service
          </h1>
          <p className="text-[12px] text-[var(--fg-mute)] mt-2 font-mono">
            Last updated: 2026-08-08
          </p>
        </header>

        <Section title="1. Agreement">
          <p>
            These Terms of Service (the &ldquo;Terms&rdquo;) govern your access
            to and use of Futurist (the &ldquo;Service&rdquo;), operated by
            the individual or entity behind the domain on which you accessed
            it (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). By
            creating an account or otherwise using the Service, you agree to
            these Terms. If you do not agree, do not use the Service.
          </p>
        </Section>

        <Section title="2. What Futurist is">
          <p>
            Futurist is a read-only data-analytics platform that aggregates
            publicly available information from third-party prediction market
            venues (currently Kalshi and Polymarket). We do not execute
            trades, hold customer funds, or route orders. Nothing on the
            Service is a solicitation to buy or sell any security, contract,
            or other financial instrument. See our{" "}
            <a
              href="/legal/risk-disclosure"
              className="underline hover:text-[var(--accent-primary)]"
            >
              Risk Disclosure
            </a>{" "}
            for the full disclaimer.
          </p>
        </Section>

        <Section title="3. Eligibility">
          <p>
            You must be at least 18 years of age (or the age of majority in
            your jurisdiction, whichever is higher) to use the Service. By
            using it you represent that you meet this requirement and that
            you are not barred from doing so under the laws of any
            jurisdiction that applies to you.
          </p>
        </Section>

        <Section title="4. Accounts">
          <p>
            You are responsible for maintaining the confidentiality of your
            account credentials and for all activity that occurs under your
            account. Notify us immediately if you become aware of any
            unauthorized use. We reserve the right to suspend or terminate
            accounts that appear to be shared, automated, or otherwise used
            in violation of these Terms.
          </p>
        </Section>

        <Section title="5. Subscriptions & billing">
          <p>
            Paid tiers (Pro, Institutional) are billed on a recurring basis
            through Stripe, our payment processor, in accordance with the
            plan you select at checkout. Trial periods, if any, are shown
            during checkout. You authorize us — through Stripe — to charge
            your payment method on each renewal until you cancel.
          </p>
          <p>
            You can cancel or change your plan at any time from your account
            settings. Cancellation takes effect at the end of the current
            billing period; we do not offer prorated refunds for the unused
            portion of a paid period, except where required by law.
          </p>
          <p>
            Prices may change. We will provide reasonable notice before a
            price change takes effect on your subscription; continued use
            after the change constitutes acceptance.
          </p>
        </Section>

        <Section title="6. Team seats">
          <p>
            Institutional subscribers may invite additional members to their
            team, up to the seat cap displayed in-app. Every seat inherits
            Institutional access on the owner&rsquo;s subscription. The team
            owner is responsible for all invitations and for the acceptable
            use of every seat. Removing a member ends their inherited access
            immediately.
          </p>
        </Section>

        <Section title="7. API keys & rate limits">
          <p>
            API keys issued through the Service authenticate requests made on
            your behalf. Keep them secret. Any activity performed with your
            API key is attributed to your account. We may rate-limit,
            revoke, or throttle keys to protect the Service&rsquo;s
            availability without prior notice.
          </p>
        </Section>

        <Section title="8. Acceptable use">
          <p>
            You agree not to: (a) scrape, mirror, or resell the Service or
            its data feed; (b) reverse-engineer, decompile, or attempt to
            derive source code from the Service; (c) interfere with the
            Service&rsquo;s operation or attempt to gain unauthorized access
            to any part of it; (d) use the Service to violate any applicable
            law, including securities, commodities, tax, sanctions, or
            anti-money-laundering laws; (e) use the Service in any
            jurisdiction where prediction-market data services are
            prohibited.
          </p>
        </Section>

        <Section title="9. Third-party data & links">
          <p>
            Market prices, order books, news headlines, and related content
            are sourced from third parties. We do not warrant the accuracy,
            completeness, or timeliness of any third-party data. Before
            acting on any information displayed on the Service, verify it
            directly on the source venue. Links to third-party sites are
            provided for convenience only; we are not responsible for their
            content.
          </p>
        </Section>

        <Section title="10. AI-generated content">
          <p>
            Some features (including the AI Overview) use large language
            models to generate summaries. These outputs may be inaccurate,
            out of date, or fabricated. Do not rely on them as fact. Full
            disclaimer in our{" "}
            <a
              href="/legal/risk-disclosure"
              className="underline hover:text-[var(--accent-primary)]"
            >
              Risk Disclosure
            </a>
            .
          </p>
        </Section>

        <Section title="11. Intellectual property">
          <p>
            The Service, including its design, code, and non-third-party
            content, is protected by copyright and other intellectual
            property laws. We grant you a limited, revocable, non-exclusive,
            non-transferable license to use the Service for its intended
            purpose, subject to these Terms. All rights not expressly granted
            are reserved.
          </p>
        </Section>

        <Section title="12. Disclaimer of warranties">
          <p>
            THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS
            AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, WHETHER
            EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING BUT NOT
            LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
            PARTICULAR PURPOSE, TITLE, OR NON-INFRINGEMENT. WE DO NOT
            WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE,
            SECURE, OR THAT ANY DATA WILL BE ACCURATE OR COMPLETE.
          </p>
        </Section>

        <Section title="13. Limitation of liability">
          <p>
            TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT WILL WE BE
            LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
            PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, REVENUE, DATA, OR
            GOODWILL, ARISING FROM OR RELATED TO YOUR USE OF THE SERVICE,
            EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </p>
          <p>
            OUR AGGREGATE LIABILITY FOR ALL CLAIMS RELATING TO THE SERVICE
            IS LIMITED TO THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE
            TWELVE MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM, OR (B)
            USD $100.
          </p>
        </Section>

        <Section title="14. Indemnification">
          <p>
            You agree to indemnify and hold us harmless from any claims,
            losses, and expenses (including reasonable attorneys&rsquo; fees)
            arising from your use of the Service, your violation of these
            Terms, or your violation of any rights of another party.
          </p>
        </Section>

        <Section title="15. Termination">
          <p>
            You may stop using the Service at any time. We may suspend or
            terminate your access with or without notice if you violate
            these Terms, if your account is inactive for an extended period,
            or if we discontinue the Service. Sections that by their nature
            should survive termination (including disclaimers, limitations
            of liability, and dispute resolution) will survive.
          </p>
        </Section>

        <Section title="16. Governing law & disputes">
          <p>
            These Terms are governed by the laws of the jurisdiction in
            which the operator of the Service is domiciled, without regard
            to conflict-of-law principles. Any dispute arising from these
            Terms or the Service will be resolved in the courts of that
            jurisdiction, unless applicable law grants you a non-waivable
            right to sue in your own jurisdiction.
          </p>
        </Section>

        <Section title="17. Changes to these Terms">
          <p>
            We may update these Terms from time to time. Material changes
            will be signaled by updating the &ldquo;Last updated&rdquo; date
            at the top of this page, and where practical by an in-app
            notice. Continued use of the Service after a change constitutes
            acceptance of the updated Terms.
          </p>
        </Section>

        <Section title="18. Contact">
          <p>
            Questions about these Terms can be sent to the operator via the
            contact channel listed on the site. If no contact page has been
            published, questions may be sent to the email associated with
            your account&rsquo;s billing profile.
          </p>
        </Section>

        <p className="mt-10 font-mono text-[10px] tracking-[0.14em] text-[var(--fg-mute)]">
          This document is a plain-English draft. It is not legal advice and
          does not constitute a binding contract without review by qualified
          counsel. Have a lawyer review before relying on it commercially.
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
