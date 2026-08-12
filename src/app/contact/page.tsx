import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact // Futurist",
  description:
    "Get in touch with the Futurist team about support, billing, partnerships, or press.",
};

const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "hello@futurist.terminal";

/**
 * Simple contact hub. Not a form — a mailto is friction-free and doesn't
 * require an email backend. Response-time expectations are honest and
 * conservative so we don't over-promise.
 */
export default function ContactPage() {
  return (
    <main className="flex-1 flex flex-col min-h-[calc(100vh-56px)]">
      <article className="max-w-3xl mx-auto w-full px-6 py-10 text-[14px] leading-relaxed text-[var(--fg-dim)]">
        <header className="mb-8">
          <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--fg-mute)] mb-2">
            FUTURIST
          </div>
          <h1 className="text-[28px] font-semibold text-[var(--fg)] tracking-tight">
            Contact
          </h1>
          <p className="text-[14px] text-[var(--fg-dim)] mt-2">
            The fastest way to reach us is email. We read everything and
            reply personally.
          </p>
        </header>

        <Row label="Support & billing">
          <p>
            Account help, subscription questions, feature requests, bug
            reports:
          </p>
          <p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-mono text-[13px] text-[var(--accent-primary)] hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
          <p className="text-[12px] text-[var(--fg-mute)]">
            Typical response: within 1 business day. Complex issues may take
            longer.
          </p>
        </Row>

        <Row label="Security disclosure">
          <p>
            Found a vulnerability? Please follow our{" "}
            <Link
              href="/security"
              className="underline hover:text-[var(--accent-primary)]"
            >
              security disclosure policy
            </Link>
            . Do not open a public bug report on GitHub.
          </p>
        </Row>

        <Row label="Press & partnerships">
          <p>
            Media inquiries, integration proposals, and other partnership
            questions: same email as above with{" "}
            <code className="text-[var(--fg)]">[PARTNER]</code> in the
            subject line so it doesn&rsquo;t get lost in the support queue.
          </p>
        </Row>

        <Row label="Common questions">
          <p>
            Before writing in, check the{" "}
            <Link
              href="/faq"
              className="underline hover:text-[var(--accent-primary)]"
            >
              FAQ
            </Link>{" "}
            — the answer might already be there. Live service status is on
            the{" "}
            <Link
              href="/status"
              className="underline hover:text-[var(--accent-primary)]"
            >
              status page
            </Link>
            .
          </p>
        </Row>

        <p className="mt-10 font-mono text-[10px] tracking-[0.14em] text-[var(--fg-mute)]">
          We don&rsquo;t sell your email or subscribe you to lists. Support
          replies come from a real person.
        </p>
      </article>
    </main>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="font-mono text-[11px] tracking-[0.18em] uppercase text-[var(--accent-primary)] mb-3">
        {label}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
