"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fmtSmartTime } from "@/lib/format";

type Notification = {
  id: string;
  title: string;
  body: string;
  marketQuestion: string;
  externalUrl: string | null;
  triggeredAt: string;
  readAt: string | null;
};

type Resp = {
  configured: boolean;
  unread: number;
  notifications: Notification[];
};

const POLL_INTERVAL_MS = 30 * 1000;

/**
 * TopNav bell — polls /api/notifications every 30s, shows unread count as
 * an orange dot, opens a popover with recent items. Clicking an item marks
 * it read and opens the market's exchange URL in a new tab (since we don't
 * yet have a router callback threaded up from HomeView).
 */
export function NotificationBell() {
  const [data, setData] = useState<Resp | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=25", { signal });
      if (!res.ok) return;
      const json = (await res.json()) as Resp;
      if (signal?.aborted) return;
      setData(json);
    } catch {
      /* silent — bell is best-effort */
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    const id = setInterval(() => load(ctrl.signal), POLL_INTERVAL_MS);
    return () => {
      ctrl.abort();
      clearInterval(id);
    };
  }, [load]);

  // Dismiss on outside click / Escape
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

  const unread = data?.unread ?? 0;

  async function markOneRead(id: string) {
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      /* silent */
    }
    // Optimistically update local state so the UI feels instant
    setData((cur) =>
      cur
        ? {
            ...cur,
            unread: Math.max(0, cur.unread - 1),
            notifications: cur.notifications.map((n) =>
              n.id === id && n.readAt === null
                ? { ...n, readAt: new Date().toISOString() }
                : n,
            ),
          }
        : cur,
    );
  }

  async function markAllRead() {
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    } catch {
      /* silent */
    }
    setData((cur) =>
      cur
        ? {
            ...cur,
            unread: 0,
            notifications: cur.notifications.map((n) =>
              n.readAt ? n : { ...n, readAt: new Date().toISOString() },
            ),
          }
        : cur,
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative w-7 h-7 rounded-sm bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--fg-dim)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)] flex items-center justify-center text-[13px]"
      >
        ◔
        {unread > 0 && (
          <span
            aria-label={`${unread} unread`}
            className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--accent-primary)] text-black text-[9px] font-mono font-semibold flex items-center justify-center tabular-nums"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-[360px] max-w-[92vw] bg-[var(--bg-elev)] border border-[var(--border)] rounded-sm shadow-2xl z-40 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] bg-[var(--bg)]">
            <div className="font-mono text-[10px] tracking-[0.16em] text-[var(--fg-mute)]">
              NOTIFICATIONS
              {loading && (
                <span className="ml-2 text-[var(--fg-mute)]">·  live</span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="font-mono text-[10px] tracking-[0.12em] text-[var(--fg-dim)] hover:text-[var(--accent-primary)]"
              >
                MARK ALL READ
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-[420px] overflow-y-auto">
            {!data?.configured ? (
              <EmptyMsg>
                In-app alerts require ALERT_EMAIL_TO env var to be set.
              </EmptyMsg>
            ) : data.notifications.length === 0 ? (
              <EmptyMsg>
                No alerts have fired yet. Set a price alert from any market's
                detail pane to get notified here.
              </EmptyMsg>
            ) : (
              <ul className="divide-y divide-[var(--border-soft)]">
                {data.notifications.map((n) => {
                  const unreadItem = n.readAt === null;
                  return (
                    <li
                      key={n.id}
                      className={`px-3 py-2 hover:bg-[var(--bg-row)] cursor-pointer relative ${
                        unreadItem ? "bg-[rgba(255,102,0,0.04)]" : ""
                      }`}
                      onClick={() => {
                        markOneRead(n.id);
                        if (n.externalUrl) {
                          window.open(n.externalUrl, "_blank", "noopener");
                        }
                      }}
                    >
                      {unreadItem && (
                        <span
                          aria-hidden
                          className="absolute left-0 top-2 bottom-2 w-[3px] bg-[var(--accent-primary)]"
                        />
                      )}
                      <div className="flex items-baseline justify-between gap-2 font-mono text-[10px] tracking-[0.06em] text-[var(--fg-mute)] mb-0.5">
                        <span className="text-[var(--accent-primary)]">
                          ALERT
                        </span>
                        <span>{fmtSmartTime(new Date(n.triggeredAt))}</span>
                      </div>
                      <div className="text-[12px] text-white font-semibold leading-snug">
                        {n.title}
                      </div>
                      <div className="text-[11px] text-[var(--fg-dim)] mt-0.5">
                        {n.body}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-6 text-center text-[12px] text-[var(--fg-mute)]">
      {children}
    </div>
  );
}
