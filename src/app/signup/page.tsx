"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { isSupabaseConfigured, supabaseBrowser } from "@/lib/supabase/client";
import { AuthShell, Field, NotConfigured } from "../login/page";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ageOk, setAgeOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isSupabaseConfigured()) return <NotConfigured />;

  async function onSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!ageOk) {
      setError("You must confirm you are 18 or older.");
      return;
    }
    setBusy(true);
    try {
      const sb = supabaseBrowser();
      const { error } = await sb.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-up failed");
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
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (e) {
      setError(e instanceof Error ? e.message : "OAuth start failed");
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <AuthShell title="Check your email">
        <p className="text-[13px] text-[var(--fg-dim)] leading-relaxed">
          We&apos;ve sent a confirmation link to{" "}
          <span className="text-[var(--fg)] font-mono">{email}</span>. Click
          the link to finish creating your account. You can close this tab.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="mt-4 w-full px-3 py-2 rounded-sm font-mono text-[11px] tracking-[0.14em] border border-[var(--border)] hover:border-[var(--fg-mute)]"
        >
          BACK TO SIGN IN
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create your account">
      <button
        onClick={onGoogle}
        disabled={busy || !ageOk}
        className="w-full mb-3 border border-[var(--border)] rounded-sm px-3 py-2 text-[13px] hover:border-[var(--fg-mute)] disabled:opacity-50"
        title={!ageOk ? "Confirm you're 18+ first" : undefined}
      >
        Continue with Google
      </button>

      <div className="flex items-center gap-2 my-3 text-[10px] font-mono tracking-[0.14em] text-[var(--fg-mute)]">
        <span className="flex-1 h-px bg-[var(--border)]" />
        OR
        <span className="flex-1 h-px bg-[var(--border)]" />
      </div>

      <form onSubmit={onSignup} className="space-y-3">
        <Field label="EMAIL">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent-primary)] rounded-sm px-3 py-2 text-[13px] outline-none"
          />
        </Field>
        <Field label="PASSWORD (min 8 chars)">
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent-primary)] rounded-sm px-3 py-2 text-[13px] outline-none"
          />
        </Field>
        <label className="flex items-start gap-2 text-[12px] text-[var(--fg-dim)] cursor-pointer leading-snug pt-1">
          <input
            type="checkbox"
            checked={ageOk}
            onChange={(e) => setAgeOk(e.target.checked)}
            className="mt-0.5 accent-[var(--accent-primary)]"
          />
          <span>
            I confirm I am 18 years of age or older, and I&apos;ve read the{" "}
            <Link
              href="/legal/risk-disclosure"
              target="_blank"
              className="text-[var(--accent-primary)] underline"
            >
              Risk Disclosure
            </Link>
            .
          </span>
        </label>
        {error && (
          <div className="text-[12px] text-[var(--accent-down)] font-mono">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={busy || !ageOk}
          className="w-full px-3 py-2 rounded-sm font-mono text-[11px] tracking-[0.14em] bg-[var(--accent-primary)] text-black hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "CREATING…" : "CREATE ACCOUNT"}
        </button>
      </form>

      <div className="mt-4 text-[12px] text-center">
        <Link
          href="/login"
          className="text-[var(--fg-dim)] hover:text-[var(--accent-primary)]"
        >
          Already have an account? Sign in →
        </Link>
      </div>
    </AuthShell>
  );
}
