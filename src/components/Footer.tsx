import Link from "next/link";

/**
 * Sitewide footer. Renders on every page via layout.tsx. Contains the
 * legally-important disclaimer + links to the risk & data-sources pages.
 * Keep this deliberately understated — the whole product is content-first.
 */
export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--bg-elev)]">
      <div className="max-w-[1400px] mx-auto px-4 py-4 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6 text-[11px] text-[var(--fg-mute)]">
        {/* Brand + copyright */}
        <div className="font-mono tracking-[0.16em]">
          <span className="text-[var(--accent-primary)]">▍</span>{" "}
          FUTURIST ·{" "}
          <span className="text-[var(--fg-dim)]">
            © {new Date().getFullYear()}
          </span>
        </div>

        {/* Disclaimer — required copy */}
        <div className="flex-1 leading-relaxed text-[var(--fg-dim)]">
          Data-analytics platform. Not financial advice. Prediction-market
          trading involves substantial risk of loss. See our{" "}
          <Link
            href="/legal/risk-disclosure"
            className="underline text-[var(--fg)] hover:text-[var(--accent-primary)]"
          >
            Risk Disclosure
          </Link>{" "}
          for details.
        </div>

        {/* Nav links — grouped: Company · Legal */}
        <nav className="flex items-center flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] tracking-[0.14em]">
          <Link href="/faq" className="hover:text-[var(--accent-primary)]">
            FAQ
          </Link>
          <Link href="/changelog" className="hover:text-[var(--accent-primary)]">
            CHANGELOG
          </Link>
          <Link href="/status" className="hover:text-[var(--accent-primary)]">
            STATUS
          </Link>
          <Link href="/security" className="hover:text-[var(--accent-primary)]">
            SECURITY
          </Link>
          <Link href="/contact" className="hover:text-[var(--accent-primary)]">
            CONTACT
          </Link>
          <span className="text-[var(--fg-mute)]">·</span>
          <Link
            href="/legal/risk-disclosure"
            className="hover:text-[var(--accent-primary)]"
          >
            RISK
          </Link>
          <Link
            href="/legal/data-sources"
            className="hover:text-[var(--accent-primary)]"
          >
            DATA SOURCES
          </Link>
          <Link
            href="/legal/terms"
            className="hover:text-[var(--accent-primary)]"
          >
            TERMS
          </Link>
          <Link
            href="/legal/privacy"
            className="hover:text-[var(--accent-primary)]"
          >
            PRIVACY
          </Link>
          <Link
            href="/legal/cookies"
            className="hover:text-[var(--accent-primary)]"
          >
            COOKIES
          </Link>
        </nav>
      </div>
    </footer>
  );
}
