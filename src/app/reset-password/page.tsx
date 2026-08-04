"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabaseBrowser } from "@/lib/supabase/client";
import { AuthShell, Field, NotConfigured } from "../login/page";

/**
 * Handles both flows of Supabase password reset:
 *
 *  1. "Request" flow: user enters their email, we send a reset link.
 *  2. "Confirm" flow: user arrives here from that emailed link; Supabase has
 *     already put them into a temporary recovery session and they set a new
 *     password. We detect the recovery session on mount and swap the form.
 */
export default function ResetPasswordPage() {
  const [mode, setMode] = useState<"request" | "confirm">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const sb = supabaseBrowser();
    const { data: sub } = sb.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("confirm");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured()) return <NotConfigured />;

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const sb = supabaseBrowser();
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset request failed");
    } finally {
      setBusy(false);
    }
  }

  async function confirmNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const sb = supabaseBrowser();
      const { error } = await sb.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Password update failed");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AuthShell title="Password updated">
        <p className="text-[13px] text-[var(--fg-dim)] leading-relaxed mb-4">
          Your password has been changed. You&apos;re signed in.
        </p>
        <Link
          href="/account"
          className="block w-full text-center px-3 py-2 rounded-sm font-mono text-[11px] tracking-[0.14em] bg-[var(--accent-primary)] text-black hover:opacity-90"
        >
          GO TO ACCOUNT
        </Link>
      </AuthShell>
    );
  }

  if (mode === "confirm") {
    return (
      <AuthShell title="Set a new password">
        <form onSubmit={confirmNewPassword} className="space-y-3">
          <Field label="NEW PASSWORD (min 8 chars)">
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent-primary)] rounded-sm px-3 py-2 text-[13px] outline-none"
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
            {busy ? "SAVING…" : "SAVE NEW PASSWORD"}
          </button>
        </form>
      </AuthShell>
    );
  }

  if (sent) {
    return (
      <AuthShell title="Check your email">
        <p className="text-[13px] text-[var(--fg-dim)] leading-relaxed">
          If <span className="text-[var(--fg)] font-mono">{email}</span> is on
          file, we&apos;ve sent a reset link. Click it to set a new password.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset your password">
      <p className="text-[12px] text-[var(--fg-dim)] mb-3">
        Enter your account email and we&apos;ll send you a reset link.
      </p>
      <form onSubmit={requestReset} className="space-y-3">
        <Field label="EMAIL">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent-primary)] rounded-sm px-3 py-2 text-[13px] outline-none"
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
          {busy ? "SENDING…" : "SEND RESET LINK"}
        </button>
      </form>
      <div className="mt-4 text-[12px] text-center">
        <Link
          href="/login"
          className="text-[var(--fg-dim)] hover:text-[var(--accent-primary)]"
        >
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
