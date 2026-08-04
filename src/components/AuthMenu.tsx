"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isSupabaseConfigured, supabaseBrowser } from "@/lib/supabase/client";

/**
 * TopNav account menu. Guest state = Sign In / Sign Up buttons. Signed-in =
 * avatar with initial + dropdown (Account, Sign out). If Supabase isn't
 * configured we fall back to the original placeholder avatar so the site
 * still renders identically.
 */
export function AuthMenu() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoaded(true);
      return;
    }
    const sb = supabaseBrowser();
    sb.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setLoaded(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_ev, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    const sb = supabaseBrowser();
    await sb.auth.signOut();
    setOpen(false);
    router.refresh();
  }

  // Not configured — fall back to the original static M badge
  if (!isSupabaseConfigured()) {
    return (
      <button
        aria-label="Account"
        className="w-7 h-7 rounded-sm bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--fg-dim)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)] font-mono text-[11px]"
        title="Auth not configured"
      >
        M
      </button>
    );
  }

  // Still loading — render a neutral placeholder to avoid layout shift
  if (!loaded) {
    return (
      <div className="w-7 h-7 rounded-sm bg-[var(--bg-elev)] border border-[var(--border)]" />
    );
  }

  // Guest — offer sign in
  if (!email) {
    return (
      <div className="flex items-center gap-1">
        <Link
          href="/login"
          className="hidden md:inline font-mono text-[10px] tracking-[0.14em] text-[var(--fg-dim)] hover:text-[var(--accent-primary)] border border-[var(--border)] rounded-sm px-2.5 py-1"
        >
          SIGN IN
        </Link>
        <Link
          href="/signup"
          className="font-mono text-[10px] tracking-[0.14em] bg-[var(--accent-primary)] text-black rounded-sm px-2.5 py-1 hover:opacity-90"
        >
          SIGN UP
        </Link>
      </div>
    );
  }

  const initial = email.slice(0, 1).toUpperCase();
  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        className="w-7 h-7 rounded-sm bg-[var(--accent-primary)] text-black font-mono text-[11px] font-semibold flex items-center justify-center hover:opacity-90"
      >
        {initial}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-[var(--bg-elev)] border border-[var(--border)] rounded-sm shadow-2xl z-40 overflow-hidden">
          <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--bg)]">
            <div className="font-mono text-[9px] tracking-[0.16em] text-[var(--fg-mute)]">
              SIGNED IN AS
            </div>
            <div className="text-[12px] text-[var(--fg)] truncate">{email}</div>
          </div>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-[12px] hover:bg-[var(--bg-row)]"
          >
            Account settings
          </Link>
          <button
            onClick={signOut}
            className="w-full text-left px-3 py-2 text-[12px] text-[var(--accent-down)] hover:bg-[var(--bg-row)] border-t border-[var(--border-soft)]"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
