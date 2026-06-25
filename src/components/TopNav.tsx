"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Minimal top nav for Vertex Terminal: logo, search, secondary nav links,
 * and a placeholder user control. Search writes ?q= into the URL so the
 * home feed can read it via useSearchParams.
 */
const LINKS: Array<{ href: string; label: string }> = [
  { href: "/", label: "Markets" },
  { href: "/flow", label: "Order Flow" },
  { href: "/news", label: "News" },
  { href: "/calendar", label: "Calendar" },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const [q, setQ] = useState(initialQ);

  // Keep input in sync if URL is changed externally
  useEffect(() => {
    setQ(initialQ);
  }, [initialQ]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    const path = "/";
    router.push(trimmed ? `${path}?q=${encodeURIComponent(trimmed)}` : path);
  }

  return (
    <header className="sticky top-0 z-30 flex items-center gap-6 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur px-5 h-14">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 select-none">
        <span className="text-[var(--accent-primary)] text-lg">▲</span>
        <span className="font-semibold tracking-tight text-[15px] text-white">
          Futurist
        </span>
      </Link>

      {/* Search */}
      <form onSubmit={submit} className="flex-1 max-w-xl">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-mute)]">
            ⌕
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search markets…"
            className="w-full bg-[var(--bg-elev)] border border-transparent focus:border-[var(--border)] rounded-full pl-9 pr-4 py-2 text-sm text-white placeholder:text-[var(--fg-mute)] outline-none transition-colors"
          />
        </div>
      </form>

      {/* Secondary nav links */}
      <nav className="hidden md:flex items-center gap-1 text-[13px]">
        {LINKS.map((l) => {
          const active =
            l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-full transition-colors ${
                active
                  ? "bg-[var(--bg-elev)] text-white"
                  : "text-[var(--fg-dim)] hover:text-white hover:bg-[var(--bg-elev)]"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      {/* User control (placeholder — no real auth yet) */}
      <div className="flex items-center gap-3">
        <span className="hidden lg:flex items-center gap-1.5 text-[11px] text-[var(--fg-dim)]">
          <span className="live-dot" /> Live
        </span>
        <button
          aria-label="Account"
          className="w-8 h-8 rounded-full bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--fg-dim)] hover:text-white hover:bg-[var(--bg-hover)] text-sm font-medium"
        >
          M
        </button>
      </div>
    </header>
  );
}
