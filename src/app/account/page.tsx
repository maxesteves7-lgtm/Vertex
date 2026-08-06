"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabaseBrowser } from "@/lib/supabase/client";
import { AuthShell, NotConfigured } from "../login/page";

type SubResp = {
  signedIn: boolean;
  email: string | null;
  subscription: {
    tier: "free" | "pro" | "institutional";
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  };
};

export default function AccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Email change
  const [newEmail, setNewEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<
    { kind: "ok"; msg: string } | { kind: "err"; msg: string } | null
  >(null);

  // Password change
  const [newPass, setNewPass] = useState("");
  const [passStatus, setPassStatus] = useState<
    { kind: "ok"; msg: string } | { kind: "err"; msg: string } | null
  >(null);

  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sub, setSub] = useState<SubResp["subscription"] | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoaded(true);
      return;
    }
    const sb = supabaseBrowser();
    sb.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) {
        router.push("/login?next=/account");
        return;
      }
      setEmail(u.email ?? null);
      setLoaded(true);
      // Load subscription state in parallel; failure is non-fatal
      fetch("/api/subscription")
        .then((r) => r.json())
        .then((j: SubResp) => setSub(j.subscription))
        .catch(() => {
          /* ignore */
        });
    });
  }, [router]);

  async function openPortal() {
    setPortalBusy(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const j = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !j.url) throw new Error(j.error ?? `HTTP ${res.status}`);
      window.location.href = j.url;
    } catch (e) {
      alert(
        `Portal open failed: ${e instanceof Error ? e.message : "unknown"}. ` +
          `Make sure STRIPE_SECRET_KEY is set and you have an active subscription.`,
      );
      setPortalBusy(false);
    }
  }

  if (!isSupabaseConfigured()) return <NotConfigured />;
  if (!loaded) {
    return (
      <AuthShell title="Loading…">
        <div className="text-[12px] text-[var(--fg-mute)] font-mono">
          Checking your session…
        </div>
      </AuthShell>
    );
  }

  async function changeEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setEmailStatus(null);
    try {
      const sb = supabaseBrowser();
      const { error } = await sb.auth.updateUser({ email: newEmail });
      if (error) throw error;
      setEmailStatus({
        kind: "ok",
        msg: `Verification link sent to ${newEmail}. Click it to confirm the change.`,
      });
      setNewEmail("");
    } catch (e) {
      setEmailStatus({
        kind: "err",
        msg: e instanceof Error ? e.message : "Update failed",
      });
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setPassStatus(null);
    try {
      const sb = supabaseBrowser();
      const { error } = await sb.auth.updateUser({ password: newPass });
      if (error) throw error;
      setPassStatus({ kind: "ok", msg: "Password updated." });
      setNewPass("");
    } catch (e) {
      setPassStatus({
        kind: "err",
        msg: e instanceof Error ? e.message : "Update failed",
      });
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    setBusy(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      // Locally sign out to clear cookies, then bounce home
      const sb = supabaseBrowser();
      await sb.auth.signOut();
      router.push("/?deleted=1");
      router.refresh();
    } catch (e) {
      alert(
        `Delete failed: ${e instanceof Error ? e.message : "unknown"}. ` +
          `You may need to add SUPABASE_SERVICE_ROLE_KEY in Vercel to enable account deletion.`,
      );
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  return (
    <main className="flex-1 flex justify-center px-4 py-10 min-h-[calc(100vh-56px)]">
      <div className="w-full max-w-[560px] space-y-4">
        {/* Header */}
        <div>
          <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--fg-mute)] mb-1">
            FUTURIST · ACCOUNT
          </div>
          <h1 className="text-[22px] font-semibold text-[var(--fg)] tracking-tight">
            {email}
          </h1>
          <p className="text-[12px] text-[var(--fg-dim)] mt-1">
            Signed in.{" "}
            <Link href="/" className="text-[var(--accent-primary)] hover:underline">
              Return to terminal
            </Link>
          </p>
        </div>

        {/* Subscription */}
        <Card title="Subscription">
          {sub ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-[10px] tracking-[0.14em] text-[var(--fg-mute)]">
                    CURRENT PLAN
                  </div>
                  <div className="text-[18px] font-semibold text-[var(--fg)] mt-0.5">
                    {sub.tier === "free"
                      ? "Free"
                      : sub.tier === "pro"
                        ? "Pro"
                        : "Institutional"}
                  </div>
                  <div className="text-[11px] font-mono text-[var(--fg-dim)] mt-0.5">
                    Status: {sub.status.toUpperCase()}
                    {sub.currentPeriodEnd && sub.tier !== "free" && (
                      <>
                        {" · "}
                        {sub.cancelAtPeriodEnd ? "Ends" : "Renews"}{" "}
                        {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                      </>
                    )}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-sm font-mono text-[10px] tracking-[0.14em] ${
                    sub.tier === "free"
                      ? "bg-[var(--bg-row)] text-[var(--fg-dim)]"
                      : "bg-[var(--accent-primary)] text-black"
                  }`}
                >
                  {sub.tier.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {sub.tier === "free" ? (
                  <Link
                    href="/pricing"
                    className="px-3 py-1.5 rounded-sm font-mono text-[10px] tracking-[0.14em] bg-[var(--accent-primary)] text-black hover:opacity-90"
                  >
                    UPGRADE
                  </Link>
                ) : (
                  <button
                    onClick={openPortal}
                    disabled={portalBusy}
                    className="px-3 py-1.5 rounded-sm font-mono text-[10px] tracking-[0.14em] border border-[var(--border)] hover:border-[var(--fg-mute)] disabled:opacity-50"
                  >
                    {portalBusy
                      ? "OPENING…"
                      : "MANAGE SUBSCRIPTION"}
                  </button>
                )}
                <Link
                  href="/pricing"
                  className="px-3 py-1.5 rounded-sm font-mono text-[10px] tracking-[0.14em] text-[var(--fg-dim)] hover:text-[var(--accent-primary)]"
                >
                  SEE PLANS
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-[12px] text-[var(--fg-mute)] font-mono">
              Loading subscription…
            </div>
          )}
        </Card>

        {/* Change email */}
        <Card title="Change email">
          <form onSubmit={changeEmail} className="space-y-3">
            <input
              type="email"
              required
              placeholder="new@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent-primary)] rounded-sm px-3 py-2 text-[13px] outline-none"
            />
            {emailStatus && <StatusLine s={emailStatus} />}
            <button
              type="submit"
              disabled={busy}
              className="px-3 py-1.5 rounded-sm font-mono text-[10px] tracking-[0.14em] bg-[var(--accent-primary)] text-black hover:opacity-90 disabled:opacity-50"
            >
              UPDATE EMAIL
            </button>
          </form>
        </Card>

        {/* Change password */}
        <Card title="Change password">
          <form onSubmit={changePassword} className="space-y-3">
            <input
              type="password"
              required
              minLength={8}
              placeholder="new password (min 8 chars)"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent-primary)] rounded-sm px-3 py-2 text-[13px] outline-none"
            />
            {passStatus && <StatusLine s={passStatus} />}
            <button
              type="submit"
              disabled={busy}
              className="px-3 py-1.5 rounded-sm font-mono text-[10px] tracking-[0.14em] bg-[var(--accent-primary)] text-black hover:opacity-90 disabled:opacity-50"
            >
              UPDATE PASSWORD
            </button>
          </form>
        </Card>

        {/* API Keys — only visible to Institutional users */}
        {sub?.tier === "institutional" && <ApiKeysSection />}

        {/* Delete account */}
        <Card title="Delete account" danger>
          <p className="text-[12px] text-[var(--fg-dim)] leading-relaxed mb-3">
            Permanently deletes your Futurist account and every server-side
            record tied to it — alerts, notifications, subscription data.
            Your browser-local watchlist and preferences are not touched
            (clear them manually via browser settings if desired).
            <br />
            <strong className="text-[var(--fg)]">This cannot be undone.</strong>
          </p>
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <button
                onClick={deleteAccount}
                disabled={busy}
                className="px-3 py-1.5 rounded-sm font-mono text-[10px] tracking-[0.14em] bg-[var(--accent-down)] text-[var(--fg)] hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "DELETING…" : "YES, DELETE FOREVER"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={busy}
                className="px-3 py-1.5 rounded-sm font-mono text-[10px] tracking-[0.14em] border border-[var(--border)] hover:border-[var(--fg-mute)]"
              >
                CANCEL
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-3 py-1.5 rounded-sm font-mono text-[10px] tracking-[0.14em] border border-[var(--accent-down)] text-[var(--accent-down)] hover:bg-[var(--accent-down)] hover:text-[var(--fg)]"
            >
              DELETE MY ACCOUNT
            </button>
          )}
        </Card>
      </div>
    </main>
  );
}

function Card({
  title,
  children,
  danger,
}: {
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className={`bg-[var(--bg-elev)] border rounded-sm p-4 ${
        danger ? "border-[var(--accent-down)]/40" : "border-[var(--border)]"
      }`}
    >
      <div
        className={`font-mono text-[10px] tracking-[0.18em] mb-3 ${
          danger ? "text-[var(--accent-down)]" : "text-[var(--fg-mute)]"
        }`}
      >
        {title.toUpperCase()}
      </div>
      {children}
    </div>
  );
}

function StatusLine({
  s,
}: {
  s: { kind: "ok" | "err"; msg: string };
}) {
  return (
    <div
      className={`text-[12px] font-mono ${
        s.kind === "ok" ? "text-[var(--accent-up)]" : "text-[var(--accent-down)]"
      }`}
    >
      {s.msg}
    </div>
  );
}

type KeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

/**
 * API keys management panel. Institutional-tier only. Shows a list of
 * existing keys with revoke buttons and lets the user issue a new one.
 * The plaintext key is shown ONCE right after creation — we make it
 * copy-able and instruct the user that it can't be retrieved again.
 */
function ApiKeysSection() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justIssued, setJustIssued] = useState<
    { name: string; key: string } | null
  >(null);

  useEffect(() => {
    fetch("/api/account/api-keys")
      .then((r) => r.json())
      .then((j: { keys?: KeyRow[] }) => setKeys(j.keys ?? []))
      .catch(() => setKeys([]));
  }, []);

  async function issue(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/account/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const j = (await res.json()) as {
        key?: { id: string; name: string; key: string; keyPrefix: string; createdAt: string };
        error?: string;
      };
      if (!res.ok || !j.key) throw new Error(j.error ?? `HTTP ${res.status}`);
      setJustIssued({ name: j.key.name, key: j.key.key });
      setName("");
      // Refresh list
      const list = await fetch("/api/account/api-keys").then((r) => r.json());
      setKeys(list.keys ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create key");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string, name: string) {
    if (!confirm(`Revoke "${name}"? Requests using it will start failing immediately.`)) return;
    await fetch(`/api/account/api-keys?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const list = await fetch("/api/account/api-keys").then((r) => r.json());
    setKeys(list.keys ?? []);
  }

  return (
    <Card title="API keys">
      <p className="text-[12px] text-[var(--fg-dim)] mb-3 leading-relaxed">
        Programmatic access for institutional users. Include the key as{" "}
        <span className="font-mono text-[var(--accent-primary)]">
          Authorization: Bearer fk_…
        </span>{" "}
        on requests to{" "}
        <span className="font-mono text-[var(--fg)]">/api/v1/markets</span>.
      </p>

      {/* Just-created key — shown once */}
      {justIssued && (
        <div className="mb-4 border border-[var(--accent-primary)] rounded-sm bg-[rgba(255,102,0,0.06)] p-3">
          <div className="font-mono text-[10px] tracking-[0.14em] text-[var(--accent-primary)] mb-1">
            KEY CREATED · COPY IT NOW
          </div>
          <p className="text-[11px] text-[var(--fg-dim)] mb-2">
            <strong className="text-[var(--fg)]">{justIssued.name}</strong>.
            This is the only time the full key will be shown. If you lose it
            you&apos;ll need to issue a new one.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-sm px-2 py-1.5 text-[12px] font-mono break-all">
              {justIssued.key}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(justIssued.key);
              }}
              className="px-2 py-1.5 font-mono text-[10px] tracking-[0.14em] border border-[var(--border)] hover:border-[var(--accent-primary)]"
            >
              COPY
            </button>
          </div>
          <button
            onClick={() => setJustIssued(null)}
            className="mt-2 font-mono text-[10px] tracking-[0.14em] text-[var(--fg-mute)] hover:text-[var(--fg)]"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Existing keys list */}
      {keys.length > 0 && (
        <ul className="mb-4 border border-[var(--border)] rounded-sm divide-y divide-[var(--border-soft)]">
          {keys.map((k) => (
            <li
              key={k.id}
              className="flex items-center gap-3 px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-[var(--fg)] truncate">
                  {k.name}
                  {k.revokedAt && (
                    <span className="ml-2 font-mono text-[10px] text-[var(--accent-down)]">
                      REVOKED
                    </span>
                  )}
                </div>
                <div className="font-mono text-[10px] text-[var(--fg-mute)]">
                  {k.keyPrefix} ·{" "}
                  {k.lastUsedAt
                    ? `last used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                    : "never used"}
                </div>
              </div>
              {!k.revokedAt && (
                <button
                  onClick={() => revoke(k.id, k.name)}
                  className="px-2 py-1 font-mono text-[10px] tracking-[0.14em] border border-[var(--accent-down)] text-[var(--accent-down)] rounded-sm hover:bg-[var(--accent-down)] hover:text-[var(--fg)]"
                >
                  REVOKE
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Create new key */}
      <form onSubmit={issue} className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Key label (e.g. Prod scanner backend)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          className="flex-1 bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent-primary)] rounded-sm px-3 py-2 text-[13px] outline-none"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="px-3 py-2 rounded-sm font-mono text-[10px] tracking-[0.14em] bg-[var(--accent-primary)] text-black hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "ISSUING…" : "ISSUE KEY"}
        </button>
      </form>
      {error && <StatusLine s={{ kind: "err", msg: error }} />}
    </Card>
  );
}
