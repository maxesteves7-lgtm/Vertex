"use client";

import { useEffect, useState } from "react";

/**
 * Live status page. Polls /api/status every 30 seconds. Shows per-service
 * health + latency + last-check time. Overall bar at the top reflects the
 * worst-case status across the checked services.
 */

type Health = "operational" | "degraded" | "down" | "unknown";
type Row = {
  name: string;
  status: Health;
  latencyMs: number | null;
  note?: string;
};
type Payload = {
  overall: Health;
  checkedAt: string;
  services: Row[];
};

export default function StatusPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/status", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData((await r.json()) as Payload);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fetch failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, []);

  return (
    <main className="flex-1 flex flex-col min-h-[calc(100vh-56px)]">
      <article className="max-w-3xl mx-auto w-full px-6 py-10 text-[14px] leading-relaxed text-[var(--fg-dim)]">
        <header className="mb-8">
          <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--fg-mute)] mb-2">
            FUTURIST
          </div>
          <h1 className="text-[28px] font-semibold text-[var(--fg)] tracking-tight">
            System status
          </h1>
          <p className="text-[14px] text-[var(--fg-dim)] mt-2">
            Live health of Futurist and the third-party data sources it
            depends on. Auto-refreshes every 30 seconds.
          </p>
        </header>

        {loading && !data && (
          <div className="font-mono text-[12px] text-[var(--fg-mute)]">
            Checking services…
          </div>
        )}

        {err && (
          <div className="border border-[var(--accent-down)] bg-[rgba(255,59,48,0.06)] p-3 rounded-sm mb-4">
            <div className="font-mono text-[10px] tracking-[0.14em] text-[var(--accent-down)] mb-1">
              STATUS CHECK FAILED
            </div>
            <div className="text-[12px]">{err}</div>
          </div>
        )}

        {data && (
          <>
            <OverallBanner status={data.overall} />

            <div className="mt-6 border border-[var(--border)] rounded-sm divide-y divide-[var(--border-soft)]">
              {data.services.map((s) => (
                <ServiceRow key={s.name} row={s} />
              ))}
            </div>

            <p className="mt-4 font-mono text-[10px] tracking-[0.14em] text-[var(--fg-mute)]">
              Checked {new Date(data.checkedAt).toLocaleTimeString()} · Cached
              upstream ≤ 30s
            </p>
          </>
        )}

        <p className="mt-10 text-[12px] text-[var(--fg-mute)]">
          If something looks broken here or in the app and this page shows
          &ldquo;operational,&rdquo; let us know via the contact page &mdash;
          the check may not cover the specific thing you&rsquo;re seeing.
        </p>
      </article>
    </main>
  );
}

function OverallBanner({ status }: { status: Health }) {
  const styles: Record<Health, { bg: string; fg: string; label: string }> = {
    operational: {
      bg: "bg-[rgba(0,200,5,0.08)] border-[rgba(0,200,5,0.5)]",
      fg: "text-[var(--accent-up)]",
      label: "All systems operational",
    },
    degraded: {
      bg: "bg-[rgba(255,183,0,0.08)] border-[rgba(255,183,0,0.5)]",
      fg: "text-[var(--accent-amber,#ffb700)]",
      label: "Some systems degraded",
    },
    down: {
      bg: "bg-[rgba(255,59,48,0.08)] border-[rgba(255,59,48,0.5)]",
      fg: "text-[var(--accent-down)]",
      label: "Service disruption",
    },
    unknown: {
      bg: "bg-[var(--bg-elev)] border-[var(--border)]",
      fg: "text-[var(--fg-mute)]",
      label: "Status unknown",
    },
  };
  const s = styles[status];
  return (
    <div className={`border rounded-sm px-4 py-3 flex items-center gap-3 ${s.bg}`}>
      <Dot status={status} />
      <span className={`font-mono text-[12px] tracking-[0.14em] uppercase ${s.fg}`}>
        {s.label}
      </span>
    </div>
  );
}

function ServiceRow({ row }: { row: Row }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <Dot status={row.status} />
        <div className="min-w-0">
          <div className="text-[14px] text-[var(--fg)] truncate">
            {row.name}
          </div>
          {row.note && (
            <div className="font-mono text-[10px] text-[var(--fg-mute)] truncate">
              {row.note}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        {row.latencyMs !== null && (
          <span className="font-mono text-[11px] text-[var(--fg-mute)] tabular-nums">
            {row.latencyMs}ms
          </span>
        )}
        <StatusLabel status={row.status} />
      </div>
    </div>
  );
}

function Dot({ status }: { status: Health }) {
  const color =
    status === "operational"
      ? "bg-[var(--accent-up)]"
      : status === "degraded"
        ? "bg-[var(--accent-amber,#ffb700)]"
        : status === "down"
          ? "bg-[var(--accent-down)]"
          : "bg-[var(--fg-mute)]";
  return <span className={`w-2 h-2 rounded-full ${color} shrink-0`} />;
}

function StatusLabel({ status }: { status: Health }) {
  const label =
    status === "operational"
      ? "OK"
      : status === "degraded"
        ? "SLOW"
        : status === "down"
          ? "DOWN"
          : "N/A";
  const color =
    status === "operational"
      ? "text-[var(--accent-up)] border-[var(--accent-up)]"
      : status === "degraded"
        ? "text-[var(--accent-amber,#ffb700)] border-[var(--accent-amber,#ffb700)]"
        : status === "down"
          ? "text-[var(--accent-down)] border-[var(--accent-down)]"
          : "text-[var(--fg-mute)] border-[var(--border)]";
  return (
    <span
      className={`font-mono text-[10px] tracking-[0.14em] px-2 py-0.5 border rounded-sm ${color}`}
    >
      {label}
    </span>
  );
}
