"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: Array<{ href: string; label: string; key: string }> = [
  { href: "/", label: "Screener", key: "screener" },
  { href: "/flow", label: "Order Flow", key: "flow" },
  { href: "/news", label: "News", key: "news" },
  { href: "/calendar", label: "Calendar", key: "calendar" },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <header className="flex items-stretch border-b border-[var(--border)] bg-[var(--bg-elev)] text-xs">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 border-r border-[var(--border)]">
        <span className="text-[var(--accent-primary)] font-bold tracking-[0.3em] text-sm">
          PREDIX
        </span>
        <span className="text-[var(--fg-mute)] text-[10px] uppercase tracking-wider hidden md:inline">
          v0.3
        </span>
      </div>

      {/* Tabs */}
      <nav className="flex items-stretch">
        {TABS.map((t) => {
          const active =
            t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.key}
              href={t.href}
              className={`relative px-4 flex items-center uppercase text-[11px] tracking-wider transition-colors ${
                active
                  ? "text-[var(--accent-primary)]"
                  : "text-[var(--fg-dim)] hover:text-[var(--fg)]"
              }`}
            >
              {t.label}
              {active && (
                <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[var(--accent-primary)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Status */}
      <div className="ml-auto flex items-center gap-4 px-4 text-[var(--fg-dim)] text-[11px]">
        <span className="flex items-center gap-1.5">
          <span className="live-dot" /> POLYMARKET
        </span>
        <span className="flex items-center gap-1.5">
          <span className="live-dot" /> KALSHI
        </span>
      </div>
    </header>
  );
}
