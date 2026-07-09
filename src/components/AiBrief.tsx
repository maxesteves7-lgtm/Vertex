"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ScreenerRow } from "@/lib/exchanges/types";
import { fmtSmartTime } from "@/lib/format";
import { getSource } from "./EventCard";

type Resp = {
  configured: boolean;
  content: string;
  generatedAt?: string | null;
  headlinesUsed?: number;
  error?: string;
};

type Cached = {
  content: string;
  generatedAt: string;
  headlinesUsed: number;
};

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const CACHE_KEY_PREFIX = "vertex.aiBrief.";

/**
 * Free AI-synthesized trader brief. Backed by Gemini 2.0 Flash (1,500/day
 * free from Google AI Studio). Grounded via Google News RSS headlines
 * fetched server-side — the model doesn't need paid web search.
 *
 * State machine mirrors AiOverview (News Wire) so the UX is consistent:
 * loading skeleton, stale-then-refresh, error retry, setup hint, disclaimer.
 */
export function AiBrief({ row }: { row: ScreenerRow }) {
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "ready"; content: string; generatedAt: string; headlinesUsed: number }
    | { kind: "stale"; content: string; generatedAt: string; headlinesUsed: number }
    | { kind: "error"; message: string }
    | { kind: "setup" }
  >({ kind: "idle" });
  const lastRowIdRef = useRef<string | null>(null);

  const generate = useCallback(
    async (force = false) => {
      const cacheKey = `${CACHE_KEY_PREFIX}${row.id}`;

      if (!force) {
        try {
          const raw = localStorage.getItem(cacheKey);
          if (raw) {
            const cached = JSON.parse(raw) as Cached;
            const age = Date.now() - new Date(cached.generatedAt).getTime();
            if (age < CACHE_TTL_MS) {
              setState({
                kind: "ready",
                content: cached.content,
                generatedAt: cached.generatedAt,
                headlinesUsed: cached.headlinesUsed ?? 0,
              });
              return;
            }
            setState({
              kind: "stale",
              content: cached.content,
              generatedAt: cached.generatedAt,
              headlinesUsed: cached.headlinesUsed ?? 0,
            });
          }
        } catch {
          /* ignore */
        }
      }

      setState((cur) =>
        cur.kind === "stale" ? cur : { kind: "loading" },
      );

      try {
        const source = getSource(row);
        const res = await fetch("/api/ai/brief", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            question: row.question,
            category: row.bucket,
            source,
            yesPrice: row.polymarket?.yesPrice ?? row.kalshi?.yesPrice ?? null,
            noPrice: row.polymarket?.noPrice ?? row.kalshi?.noPrice ?? null,
            volume24h: row.volume24h,
            closesAt: row.closesAt ? row.closesAt.toISOString() : null,
            priceChange24h:
              row.polymarket?.priceChange24h ??
              row.kalshi?.priceChange24h ??
              null,
          }),
        });
        const json = (await res.json()) as Resp;

        if (!json.configured) {
          setState({ kind: "setup" });
          return;
        }
        if (!res.ok || json.error) {
          setState({
            kind: "error",
            message: json.error ?? `HTTP ${res.status}`,
          });
          return;
        }

        const generatedAt = json.generatedAt ?? new Date().toISOString();
        const headlinesUsed = json.headlinesUsed ?? 0;
        setState({
          kind: "ready",
          content: json.content,
          generatedAt,
          headlinesUsed,
        });
        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              content: json.content,
              generatedAt,
              headlinesUsed,
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
    [row],
  );

  useEffect(() => {
    if (lastRowIdRef.current === row.id) return;
    lastRowIdRef.current = row.id;
    generate(false);
  }, [row.id, generate]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="px-1.5 py-0.5 rounded-sm font-mono text-[10px] tracking-[0.14em] bg-[rgba(255,102,0,0.12)] text-[var(--accent-primary)] border border-[rgba(255,102,0,0.3)]"
            title="Synthesized by Google Gemini — free tier, grounded on Google News headlines"
          >
            ⚡ AI
          </span>
          {(state.kind === "ready" || state.kind === "stale") && (
            <span className="font-mono text-[10px] tracking-[0.12em] text-[var(--fg-mute)]">
              UPDATED {fmtSmartTime(new Date(state.generatedAt))}
              {state.headlinesUsed > 0
                ? ` · ${state.headlinesUsed} HEADLINES`
                : ""}
              {state.kind === "stale" ? " · STALE" : ""}
            </span>
          )}
        </div>
        <button
          onClick={() => generate(true)}
          disabled={state.kind === "loading"}
          className="font-mono text-[10px] tracking-[0.14em] text-[var(--fg-mute)] hover:text-[var(--accent-primary)] disabled:opacity-50"
          title="Force refresh — re-pulls news + re-generates"
        >
          {state.kind === "loading" ? "⟳ …" : "⟳ REFRESH"}
        </button>
      </div>

      {/* Body */}
      {state.kind === "loading" && <LoadingSkeleton />}
      {state.kind === "setup" && <SetupHint />}
      {state.kind === "error" && (
        <ErrorState message={state.message} onRetry={() => generate(true)} />
      )}
      {(state.kind === "ready" || state.kind === "stale") && (
        <div>
          {state.kind === "stale" && (
            <div className="mb-2 font-mono text-[10px] tracking-[0.14em] text-[var(--accent-amber)]">
              CACHED · REFRESHING…
            </div>
          )}
          <div className="space-y-3 text-[13px] leading-relaxed text-[var(--fg)]">
            {renderMarkdown(state.content)}
          </div>
        </div>
      )}

      {state.kind !== "setup" && (
        <div className="mt-3 font-mono text-[9px] tracking-[0.1em] text-[var(--fg-mute)]">
          AI-GENERATED OVERVIEW. VERIFY BEFORE TRADING.
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// States
// ─────────────────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-[var(--fg-mute)]">
        <span className="live-dot" />
        <span>PULLING NEWS + WRITING BRIEF · 3–8s</span>
      </div>
      <div className="space-y-1.5">
        {[80, 92, 65, 88, 74, 90, 60].map((w, i) => (
          <div
            key={i}
            className="h-3 rounded-sm bg-[var(--bg-elev)] animate-pulse"
            style={{
              width: `${w}%`,
              animationDelay: `${i * 80}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function SetupHint() {
  return (
    <div className="rounded-sm border border-dashed border-[var(--border)] p-3">
      <div className="font-mono text-[10px] tracking-[0.14em] text-[var(--fg-mute)] mb-1">
        AI OVERVIEW OFFLINE
      </div>
      <p className="text-[12px] text-[var(--fg-dim)] leading-relaxed">
        Add a{" "}
        <span className="font-mono text-[var(--accent-primary)]">
          GEMINI_API_KEY
        </span>{" "}
        env var in Vercel to enable the AI overview. Get a free key at{" "}
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent-primary)] hover:underline"
        >
          aistudio.google.com/apikey
        </a>{" "}
        (Google&apos;s free tier is 1,500 requests/day, no billing).
      </p>
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
        GENERATION FAILED
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

// ─────────────────────────────────────────────────────────────────────────────
// Minimal markdown → JSX
// ─────────────────────────────────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const lines = text.split("\n");
  let bulletBuf: string[] = [];

  const flushBullets = () => {
    if (bulletBuf.length === 0) return;
    nodes.push(
      <ul
        key={`ul-${nodes.length}`}
        className="list-disc pl-5 space-y-1 text-[var(--fg-dim)]"
      >
        {bulletBuf.map((b, i) => (
          <li key={i}>
            <span className="text-[var(--fg)]">{renderInline(b)}</span>
          </li>
        ))}
      </ul>,
    );
    bulletBuf = [];
  };

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (trimmed === "") {
      flushBullets();
      continue;
    }
    if (/^[-*•]\s+/.test(trimmed)) {
      bulletBuf.push(trimmed.replace(/^[-*•]\s+/, ""));
      continue;
    }
    if (/^\*\*(.+)\*\*:?$/.test(trimmed) || /^###\s+/.test(trimmed)) {
      flushBullets();
      const headerText = trimmed
        .replace(/^\*\*/, "")
        .replace(/\*\*:?$/, "")
        .replace(/^###\s+/, "");
      nodes.push(
        <h4
          key={`h-${nodes.length}`}
          className="font-mono text-[11px] tracking-[0.16em] uppercase text-[var(--accent-primary)] mt-3 first:mt-0"
        >
          {headerText}
        </h4>,
      );
      continue;
    }
    flushBullets();
    nodes.push(
      <p key={`p-${nodes.length}`} className="text-[var(--fg-dim)]">
        <span className="text-[var(--fg)]">{renderInline(trimmed)}</span>
      </p>,
    );
  }
  flushBullets();
  return nodes;
}

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) {
      return (
        <strong key={i} className="text-[var(--fg)]">
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{p}</span>;
  });
}
