"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ScreenerRow } from "@/lib/exchanges/types";
import { fmtSmartTime } from "@/lib/format";

type WireItem = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  snippet: string;
};

type Resp = {
  items: WireItem[];
  query: string;
  generatedAt: string;
  error?: string | null;
};

type Cached = {
  items: WireItem[];
  query: string;
  generatedAt: string;
};

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const CACHE_KEY_PREFIX = "vertex.newswire.";

/**
 * "News Wire" panel for the market detail view. Free — pulls recent
 * headlines from Google News RSS. Kept under the AiOverview file name so
 * the deployed clients keep working through the swap, but the panel no
 * longer calls Anthropic and costs zero.
 */
export function AiOverview({ row }: { row: ScreenerRow }) {
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "ready"; items: WireItem[]; query: string; generatedAt: string }
    | { kind: "stale"; items: WireItem[]; query: string; generatedAt: string }
    | { kind: "empty"; query: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });
  const lastRowIdRef = useRef<string | null>(null);

  const load = useCallback(
    async (force = false) => {
      const cacheKey = `${CACHE_KEY_PREFIX}${row.id}`;

      // Cache hit
      if (!force) {
        try {
          const raw = localStorage.getItem(cacheKey);
          if (raw) {
            const cached = JSON.parse(raw) as Cached;
            const age = Date.now() - new Date(cached.generatedAt).getTime();
            if (age < CACHE_TTL_MS) {
              setState(
                cached.items.length > 0
                  ? {
                      kind: "ready",
                      items: cached.items,
                      query: cached.query,
                      generatedAt: cached.generatedAt,
                    }
                  : { kind: "empty", query: cached.query },
              );
              return;
            }
            if (cached.items.length > 0) {
              setState({
                kind: "stale",
                items: cached.items,
                query: cached.query,
                generatedAt: cached.generatedAt,
              });
            }
          }
        } catch {
          /* ignore */
        }
      }

      setState((cur) =>
        cur.kind === "stale" ? cur : { kind: "loading" },
      );

      try {
        const res = await fetch("/api/ai/overview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            question: row.question,
            category: row.bucket,
          }),
        });
        const json = (await res.json()) as Resp;
        if (!res.ok) {
          setState({
            kind: "error",
            message: json.error ?? `HTTP ${res.status}`,
          });
          return;
        }
        if (json.error) {
          setState({ kind: "error", message: json.error });
          return;
        }
        if (json.items.length === 0) {
          setState({ kind: "empty", query: json.query });
        } else {
          setState({
            kind: "ready",
            items: json.items,
            query: json.query,
            generatedAt: json.generatedAt,
          });
        }
        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              items: json.items,
              query: json.query,
              generatedAt: json.generatedAt,
            } satisfies Cached),
          );
        } catch {
          /* quota — ignore */
        }
      } catch (e) {
        setState({
          kind: "error",
          message: e instanceof Error ? e.message : "network error",
        });
      }
    },
    [row.id, row.question, row.bucket],
  );

  // Auto-fetch when a different row is opened
  useEffect(() => {
    if (lastRowIdRef.current === row.id) return;
    lastRowIdRef.current = row.id;
    load(false);
  }, [row.id, load]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="px-1.5 py-0.5 rounded-sm font-mono text-[10px] tracking-[0.14em] bg-[rgba(255,102,0,0.12)] text-[var(--accent-primary)] border border-[rgba(255,102,0,0.3)]"
            title="Live headlines from Google News RSS"
          >
            📡 WIRE
          </span>
          {(state.kind === "ready" || state.kind === "stale") && (
            <span className="font-mono text-[10px] tracking-[0.12em] text-[var(--fg-mute)]">
              UPDATED {fmtSmartTime(new Date(state.generatedAt))}
              {state.kind === "stale" ? " · STALE" : ""}
            </span>
          )}
        </div>
        <button
          onClick={() => load(true)}
          disabled={state.kind === "loading"}
          className="font-mono text-[10px] tracking-[0.14em] text-[var(--fg-mute)] hover:text-[var(--accent-primary)] disabled:opacity-50"
          title="Force refresh — new query against Google News"
        >
          {state.kind === "loading" ? "⟳ …" : "⟳ REFRESH"}
        </button>
      </div>

      {/* Body */}
      {state.kind === "loading" && <LoadingSkeleton />}
      {state.kind === "error" && (
        <ErrorState message={state.message} onRetry={() => load(true)} />
      )}
      {state.kind === "empty" && (
        <EmptyState query={state.query} question={row.question} />
      )}
      {(state.kind === "ready" || state.kind === "stale") && (
        <>
          {state.kind === "stale" && (
            <div className="mb-2 font-mono text-[10px] tracking-[0.14em] text-[var(--accent-amber)]">
              CACHED · REFRESHING…
            </div>
          )}
          <WireList items={state.items} />
          <SearchLinks question={row.question} />
        </>
      )}

      {/* Disclaimer */}
      <div className="mt-3 font-mono text-[9px] tracking-[0.1em] text-[var(--fg-mute)]">
        HEADLINES SURFACED FROM GOOGLE NEWS. VERIFY BEFORE TRADING.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Body states
// ─────────────────────────────────────────────────────────────────────────────

function WireList({ items }: { items: WireItem[] }) {
  return (
    <ul className="divide-y divide-[var(--border-soft)] border border-[var(--border)] rounded-sm">
      {items.map((it, i) => (
        <li key={i} className="px-3 py-2 hover:bg-[var(--bg-row)] transition-colors">
          <div className="flex items-baseline justify-between gap-2 font-mono text-[10px] tracking-[0.06em] text-[var(--fg-mute)] mb-0.5">
            <span className="text-[var(--accent-primary)] truncate">
              {it.source.toUpperCase()}
            </span>
            <span>{fmtSmartTime(new Date(it.publishedAt))}</span>
          </div>
          <a
            href={it.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-[13px] leading-snug text-[var(--fg)] hover:text-[var(--accent-primary)]"
          >
            {it.title}
          </a>
          {it.snippet && (
            <p className="text-[11px] text-[var(--fg-dim)] mt-1 line-clamp-2">
              {it.snippet}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

function SearchLinks({ question }: { question: string }) {
  const q = encodeURIComponent(question);
  const links = [
    {
      label: "GOOGLE NEWS",
      url: `https://news.google.com/search?q=${q}`,
    },
    {
      label: "X / TWITTER",
      url: `https://twitter.com/search?q=${q}&f=live`,
    },
    {
      label: "REDDIT",
      url: `https://www.reddit.com/search/?q=${q}&sort=new`,
    },
  ];
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[0.14em]">
      <span className="text-[var(--fg-mute)]">SEARCH</span>
      {links.map((l) => (
        <a
          key={l.label}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2 py-0.5 rounded-sm border border-[var(--border)] text-[var(--fg-dim)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]"
        >
          {l.label} ↗
        </a>
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-[var(--fg-mute)]">
        <span className="live-dot" />
        <span>QUERYING GOOGLE NEWS</span>
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="border border-[var(--border)] rounded-sm p-2 space-y-1 animate-pulse"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="h-2 w-24 bg-[var(--bg-elev)] rounded-sm" />
          <div className="h-3 w-full bg-[var(--bg-elev)] rounded-sm" />
          <div className="h-3 w-3/4 bg-[var(--bg-elev)] rounded-sm" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ query, question }: { query: string; question: string }) {
  return (
    <div className="rounded-sm border border-dashed border-[var(--border)] p-3">
      <div className="font-mono text-[10px] tracking-[0.14em] text-[var(--fg-mute)] mb-1">
        NO HEADLINES FOUND
      </div>
      <p className="text-[12px] text-[var(--fg-dim)] leading-relaxed mb-2">
        Google News returned no recent items for{" "}
        <span className="font-mono text-[var(--fg)]">{query}</span>. Try the
        deep-links below to research this market directly.
      </p>
      <SearchLinks question={question} />
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-sm border border-[var(--border)] bg-[rgba(255,59,48,0.06)] p-3">
      <div className="font-mono text-[10px] tracking-[0.14em] text-[var(--accent-down)] mb-1">
        NEWS WIRE FAILED
      </div>
      <div className="text-[12px] text-[var(--fg-dim)] mb-2 break-words">
        {message}
      </div>
      <button
        onClick={onRetry}
        className="px-3 py-1 rounded-sm font-mono text-[10px] tracking-[0.14em] bg-[var(--accent-primary)] text-black hover:opacity-90"
      >
        RETRY
      </button>
    </div>
  );
}
