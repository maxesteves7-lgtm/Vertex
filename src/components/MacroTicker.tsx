"use client";

import { useEffect, useState } from "react";
import type { MacroTick } from "@/lib/macro";

type Resp = {
  configured: boolean;
  ticks: MacroTick[];
  failures?: Array<{ id: string; reason: string }>;
};

/** Refresh every 5 minutes — FRED data updates daily/monthly at most. */
const POLL_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Global Bloomberg-style macro ticker rendered under the top nav. Live
 * headline series pulled from FRED. Silently no-ops when the FRED_API_KEY
 * env var isn't set (renders a small setup hint instead of a blank strip).
 */
export function MacroTicker() {
  const [data, setData] = useState<Resp | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/macro/ticker");
        const json = (await res.json()) as Resp;
        if (cancelled) return;
        setData(json);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "macro feed error");
      }
    };
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Not yet loaded — reserve height so the layout doesn't jump on mount.
  if (!data && !error) {
    return <div className="h-7 border-b border-[var(--border)] bg-[var(--bg-elev)]" />;
  }

  // FRED key not configured — show a small hint that vanishes as soon as
  // Max drops the key into Vercel env vars.
  if (data && data.configured === false) {
    return (
      <div className="h-7 border-b border-[var(--border)] bg-[var(--bg-elev)] flex items-center px-4">
        <span className="font-mono text-[10px] tracking-[0.14em] text-[var(--fg-mute)]">
          MACRO TICKER OFFLINE ·{" "}
          <a
            href="https://fredaccount.stlouisfed.org/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent-primary)] hover:underline"
          >
            SET FRED_API_KEY IN VERCEL
          </a>
        </span>
      </div>
    );
  }

  if (error || (data && data.ticks.length === 0)) {
    // Show the actual failure reason from FRED (bad key, bad series, rate
    // limit, etc.) so we're not left guessing.
    const detail =
      error ??
      data?.failures?.[0]?.reason ??
      "no observations returned";
    return (
      <div className="h-7 border-b border-[var(--border)] bg-[var(--bg-elev)] flex items-center px-4 overflow-hidden">
        <span className="font-mono text-[10px] tracking-[0.14em] text-[var(--accent-down)] truncate">
          MACRO FEED ERROR · {detail}
        </span>
      </div>
    );
  }

  const ticks = data!.ticks;

  return (
    <div className="border-b border-[var(--border)] bg-[var(--bg-elev)] overflow-hidden">
      <div className="flex items-center gap-6 px-4 py-1 whitespace-nowrap overflow-x-auto">
        <span className="font-mono text-[9px] tracking-[0.2em] text-[var(--fg-mute)] shrink-0">
          MACRO
        </span>
        {ticks.map((t) => (
          <TickerItem key={t.id} tick={t} />
        ))}
        <span
          className="ml-auto font-mono text-[9px] tracking-[0.14em] text-[var(--fg-mute)] shrink-0 hidden md:inline"
          title="Source: St. Louis Fed FRED"
        >
          FRED
        </span>
      </div>
    </div>
  );
}

function TickerItem({ tick }: { tick: MacroTick }) {
  const changeColor =
    tick.change === null
      ? "text-[var(--fg-mute)]"
      : tick.change > 0
        ? "text-[var(--accent-up)]"
        : tick.change < 0
          ? "text-[var(--accent-down)]"
          : "text-[var(--fg-dim)]";

  const priceColor =
    tick.change === null
      ? "text-white"
      : tick.change > 0
        ? "text-[var(--accent-up)]"
        : tick.change < 0
          ? "text-[var(--accent-down)]"
          : "text-white";

  return (
    <div
      className="flex items-baseline gap-1.5 font-mono text-[10px] tabular-nums shrink-0"
      title={`${tick.description} · as of ${tick.observedAt}`}
    >
      <span className="text-[var(--fg-mute)] tracking-[0.14em]">
        {tick.label}
      </span>
      <span className={`${priceColor} font-semibold`}>
        {formatValue(tick.value, tick.unit)}
      </span>
      {tick.change !== null && (
        <span className={changeColor}>{formatChange(tick.change, tick.unit)}</span>
      )}
    </div>
  );
}

function formatValue(v: number, unit: "%" | "idx"): string {
  if (!Number.isFinite(v)) return "—";
  if (unit === "%") return `${v.toFixed(2)}%`;
  return v.toFixed(2);
}

function formatChange(v: number, unit: "%" | "idx"): string {
  if (!Number.isFinite(v)) return "";
  const sign = v > 0 ? "+" : "";
  if (unit === "%") return `${sign}${v.toFixed(2)}pp`;
  return `${sign}${v.toFixed(2)}`;
}
