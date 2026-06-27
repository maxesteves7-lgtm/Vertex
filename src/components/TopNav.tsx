"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Terminal-style top nav. Mono Futurist wordmark with the orange terminal
 * tick, search, section nav, status pills.
 */
const LINKS: Array<{ href: string; label: string }> = [
  { href: "/", label: "SCANNER" },
  { href: "/flow", label: "FLOW" },
  { href: "/news", label: "NEWS" },
  { href: "/calendar", label: "CAL" },
  { href: "/resolved", label: "RESOLVED" },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const [q, setQ] = useState(initialQ);

  useEffect(() => {
    setQ(initialQ);
  }, [initialQ]);

  // Live clock — tiny terminal touch
  const [clock, setClock] = useState<string>(() => fmtClock(new Date()));
  useEffect(() => {
    const id = setInterval(() => setClock(fmtClock(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    router.push(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : "/");
  }

  return (
    <header className="sticky top-0 z-30 flex items-center gap-5 border-b border-[var(--border)] bg-[var(--bg)] px-4 h-12">
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2 select-none">
        <span className="text-[var(--accent-primary)] text-[18px] font-mono leading-none">
          ▍
        </span>
        <span className="font-mono font-semibold tracking-[0.16em] text-[13px] text-white">
          FUTURIST
        </span>
      </Link>

      {/* Search */}
      <form onSubmit={submit} className="flex-1 max-w-md">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-mute)] font-mono text-[12px]">
            /
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="search markets…"
            className="w-full bg-[var(--bg-elev)] border border-[var(--border-soft)] focus:border-[var(--accent-primary)] rounded-sm pl-7 pr-3 py-1.5 text-[12px] font-mono text-white placeholder:text-[var(--fg-mute)] outline-none transition-colors"
          />
        </div>
      </form>

      {/* Section nav */}
      <nav className="hidden md:flex items-stretch h-12 -my-3">
        {LINKS.map((l) => {
          const active =
            l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 flex items-center font-mono text-[10px] tracking-[0.16em] transition-colors relative ${
                active
                  ? "text-[var(--accent-primary)]"
                  : "text-[var(--fg-dim)] hover:text-white"
              }`}
            >
              {l.label}
              {active && (
                <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[var(--accent-primary)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Status */}
      <div className="hidden lg:flex items-center gap-3 font-mono text-[10px] text-[var(--fg-mute)] tracking-[0.12em]">
        <span className="flex items-center gap-1.5">
          <span className="live-dot" /> POLY
        </span>
        <span className="flex items-center gap-1.5">
          <span className="live-dot" /> KAL
        </span>
        <span className="text-[var(--fg-dim)]">{clock}</span>
      </div>

      {/* User */}
      <button
        aria-label="Account"
        className="w-7 h-7 rounded-sm bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--fg-dim)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)] font-mono text-[11px]"
      >
        M
      </button>
    </header>
  );
}

function fmtClock(d: Date): string {
  return d
    .toLocaleTimeString(undefined, { hour12: false })
    .toUpperCase();
}
