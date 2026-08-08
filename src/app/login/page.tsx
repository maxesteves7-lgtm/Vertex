"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { isSupabaseConfigured, supabaseBrowser } from "@/lib/supabase/client";
import { identify, track } from "@/lib/analytics";

/**
 * Page-level Suspense boundary — required by Next 16 because `useSearchParams`
 * (used in LoginInner for the ?next= redirect) forces client-side bailout of
 * static prerendering otherwise.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<AuthShell title="Sign in to Futurist">Loading…</AuthShell>}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/account";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isSupabaseConfigured()) {
    return <NotConfigured />;
  }

  async function onEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const sb = supabaseBrowser();
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const user = data.user;
      if (!user) throw new Error("Sign-in succeeded without a user session.");
      identify(user.id, { email: user.email ?? null });
      track("login_completed");
      router.push(next);
      router.refresh();
    } catch (e) {
      setError(explainFetchError(e));
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setError(null);
    setBusy(true);
    try {
      const sb = supabaseBrowser();
      const { error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
      // OAuth redirects out — no local nav needed
    } catch (e) {
      setError(explainFetchError(e));
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Sign in to Futurist">
      <button
        onClick={onGoogle}
        disabled={busy}
        className="w-full mb-3 border border-[var(--border)] rounded-sm px-3 py-2 text-[13px] hover:border-[var(--fg-mute)] disabled:opacity-50"
      >
        Continue with Google
      </button>

      <div className="flex items-center gap-2 my-3 text-[10px] font-mono tracking-[0.14em] text-[var(--fg-mute)]">
        <span className="flex-1 h-px bg-[var(--border)]" />
        OR
        <span className="flex-1 h-px bg-[var(--border)]" />
      </div>

      <form onSubmit={onEmailLogin} className="space-y-3">
        <Field label="EMAIL">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent-primary)] rounded-sm px-3 py-2 text-[13px] outline-none"
          />
        </Field>
        <Field label="PASSWORD">
          <PasswordInput
            value={password}
            onChange={setPassword}
            show={showPass}
            onToggle={() => setShowPass((v) => !v)}
          />
        </Field>
        {error && (
          <div className="text-[12px] text-[var(--accent-down)] font-mono">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full px-3 py-2 rounded-sm font-mono text-[11px] tracking-[0.14em] bg-[var(--accent-primary)] text-black hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "SIGNING IN…" : "SIGN IN"}
        </button>
      </form>

      <div className="mt-4 flex items-center justify-between text-[12px]">
        <Link
          href="/reset-password"
          className="text-[var(--fg-dim)] hover:text-[var(--accent-primary)]"
        >
          Forgot password?
        </Link>
        <Link
          href="/signup"
          className="text-[var(--fg-dim)] hover:text-[var(--accent-primary)]"
        >
          Create account →
        </Link>
      </div>
    </AuthShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared shells used by login / signup / reset-password
// ─────────────────────────────────────────────────────────────────────────────

export function AuthShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1 flex items-start justify-center px-4 py-10 min-h-[calc(100vh-56px)]">
      <div className="w-full max-w-[420px] bg-[var(--bg-elev)] border border-[var(--border)] rounded-sm p-6">
        <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--fg-mute)] mb-2">
          FUTURIST
        </div>
        <h1 className="text-[20px] font-semibold text-[var(--fg)] tracking-tight mb-4">
          {title}
        </h1>
        {children}
      </div>
    </main>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block font-mono text-[10px] tracking-[0.14em] text-[var(--fg-mute)] mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * Password input with a show/hide eye toggle. Shared across login, signup,
 * reset-password. `show` state is lifted to the parent so a page can toggle
 * multiple password fields together (e.g. signup's password + confirm).
 */
export function PasswordInput({
  value,
  onChange,
  show,
  onToggle,
  autoComplete = "current-password",
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete?: string;
}) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        required
        minLength={8}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent-primary)] rounded-sm pl-3 pr-14 py-2 text-[13px] outline-none font-mono"
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-sm font-mono text-[10px] tracking-[0.14em] text-[var(--fg-mute)] hover:text-[var(--accent-primary)]"
      >
        {show ? "HIDE" : "SHOW"}
      </button>
    </div>
  );
}

/**
 * Turn opaque browser fetch errors into something actionable. "Failed to
 * fetch" is what the browser reports when the request never left the tab —
 * usually a bad Supabase URL, missing env vars, or CORS/Site URL misconfig.
 */
export function explainFetchError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/failed to fetch|network|typeerror/i.test(msg)) {
    return (
      "Failed to reach Supabase. Check that (a) NEXT_PUBLIC_SUPABASE_URL and " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY are set in Vercel, (b) the Supabase project " +
      "isn't paused (free tier pauses after 7 days idle), and (c) Site URL in " +
      "Supabase auth settings includes this domain."
    );
  }
  return msg || "Request failed";
}

export function NotConfigured() {
  return (
    <AuthShell title="Sign-in unavailable">
      <p className="text-[13px] text-[var(--fg-dim)] leading-relaxed mb-3">
        Supabase auth isn&apos;t configured yet. The site owner needs to
        set{" "}
        <span className="font-mono text-[var(--accent-primary)]">
          NEXT_PUBLIC_SUPABASE_URL
        </span>{" "}
        and{" "}
        <span className="font-mono text-[var(--accent-primary)]">
          NEXT_PUBLIC_SUPABASE_ANON_KEY
        </span>{" "}
        in Vercel.
      </p>
      <p className="text-[12px] text-[var(--fg-mute)]">
        You can keep using the terminal as a guest — your watchlist, filters,
        and preferences are saved in your browser.
      </p>
    </AuthShell>
  );
}
