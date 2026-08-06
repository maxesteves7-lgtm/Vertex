"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { isSupabaseConfigured, supabaseBrowser } from "@/lib/supabase/client";
import { AuthShell, NotConfigured } from "../../login/page";

export default function TeamAcceptPage() {
  return (
    <Suspense
      fallback={<AuthShell title="Team invite">Loading…</AuthShell>}
    >
      <AcceptInner />
    </Suspense>
  );
}

function AcceptInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "authRequired" }
    | { kind: "busy" }
    | { kind: "ok"; teamName: string; ownerEmail: string }
    | { kind: "err"; msg: string }
  >({ kind: "idle" });

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    if (!token) {
      setState({ kind: "err", msg: "Missing invite token in URL." });
      return;
    }
    const sb = supabaseBrowser();
    sb.auth.getUser().then(({ data }) => {
      if (!data.user) {
        setState({ kind: "authRequired" });
      } else {
        accept();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function accept() {
    setState({ kind: "busy" });
    try {
      const res = await fetch("/api/team/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const j = (await res.json()) as {
        ok?: boolean;
        error?: string;
        teamName?: string;
        ownerEmail?: string;
      };
      if (!j.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
      setState({
        kind: "ok",
        teamName: j.teamName ?? "team",
        ownerEmail: j.ownerEmail ?? "owner",
      });
    } catch (e) {
      setState({
        kind: "err",
        msg: e instanceof Error ? e.message : "Accept failed",
      });
    }
  }

  if (!isSupabaseConfigured()) return <NotConfigured />;

  return (
    <AuthShell title="Team invitation">
      {state.kind === "idle" && (
        <p className="text-[12px] text-[var(--fg-dim)]">Loading invite…</p>
      )}
      {state.kind === "authRequired" && (
        <>
          <p className="text-[13px] text-[var(--fg-dim)] mb-4 leading-relaxed">
            You&apos;re about to join a Futurist team. Sign in or create an
            account with the same email address the invitation was sent to,
            then you&apos;ll be brought back here automatically.
          </p>
          <button
            onClick={() =>
              router.push(
                `/login?next=${encodeURIComponent(`/team/accept?token=${token}`)}`,
              )
            }
            className="w-full px-3 py-2 rounded-sm font-mono text-[11px] tracking-[0.14em] bg-[var(--accent-primary)] text-black hover:opacity-90 mb-2"
          >
            SIGN IN
          </button>
          <button
            onClick={() =>
              router.push(
                `/signup?next=${encodeURIComponent(`/team/accept?token=${token}`)}`,
              )
            }
            className="w-full px-3 py-2 rounded-sm font-mono text-[11px] tracking-[0.14em] border border-[var(--border)] hover:border-[var(--fg-mute)]"
          >
            CREATE ACCOUNT
          </button>
        </>
      )}
      {state.kind === "busy" && (
        <p className="text-[13px] text-[var(--fg-dim)]">Accepting invitation…</p>
      )}
      {state.kind === "ok" && (
        <>
          <p className="text-[13px] text-[var(--fg)] leading-relaxed mb-4">
            Welcome to <strong>{state.teamName}</strong>, owned by{" "}
            <span className="font-mono text-[var(--accent-primary)]">
              {state.ownerEmail}
            </span>
            . You now have full Institutional-tier access.
          </p>
          <Link
            href="/"
            className="block w-full text-center px-3 py-2 rounded-sm font-mono text-[11px] tracking-[0.14em] bg-[var(--accent-primary)] text-black hover:opacity-90"
          >
            OPEN THE TERMINAL
          </Link>
        </>
      )}
      {state.kind === "err" && (
        <div className="rounded-sm border border-[var(--border)] bg-[rgba(255,59,48,0.06)] p-3">
          <div className="font-mono text-[10px] tracking-[0.14em] text-[var(--accent-down)] mb-1">
            COULDN&apos;T ACCEPT
          </div>
          <div className="text-[12px] text-[var(--fg-dim)]">{state.msg}</div>
        </div>
      )}
    </AuthShell>
  );
}
