"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

type Props = {
  exchange: "POLYMARKET" | "KALSHI";
  externalMarketId: string;
  marketQuestion: string;
  /** Current YES price 0..1, used to seed the threshold slider */
  yesPrice: number | null;
};

/**
 * Inline "set alert" widget for the detail panel. Lets the user pick a
 * threshold (0..100) and a direction (above/below), then POSTs to /api/alerts.
 */
export function AlertButton({
  exchange,
  externalMarketId,
  marketQuestion,
  yesPrice,
}: Props) {
  const [open, setOpen] = useState(false);
  const seed = yesPrice ?? 0.5;
  // Default threshold +5pts above current if going BELOW, -5pts below if ABOVE — feels natural
  const [direction, setDirection] = useState<"PRICE_ABOVE" | "PRICE_BELOW">(
    "PRICE_ABOVE",
  );
  const [thresholdPct, setThresholdPct] = useState<number>(
    Math.round((seed + 0.05) * 100),
  );
  const [channel, setChannel] = useState<"IN_APP" | "EMAIL">("IN_APP");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exchange,
          externalMarketId,
          marketQuestion,
          ruleType: direction,
          threshold: thresholdPct / 100,
          channel,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      setStatus("saved");
      track("alert_created", {
        exchange,
        rule: direction,
        threshold_pct: thresholdPct,
        channel,
      });
      setTimeout(() => {
        setOpen(false);
        setStatus("idle");
      }, 1500);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "save failed");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-2.5 py-1 text-[10px] uppercase tracking-wider rounded-sm border border-[var(--border)] text-[var(--accent-amber)] hover:border-[var(--accent-amber)] hover:bg-[#1a1100]"
      >
        ⏰ Set Alert
      </button>
    );
  }

  return (
    <div className="border border-[var(--border)] bg-[var(--bg)] p-3">
      <div className="flex items-center gap-2 mb-2">
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as typeof direction)}
          className="bg-[var(--bg-elev)] border border-[var(--border)] px-2 py-1 text-xs rounded-sm focus:outline-none focus:border-[var(--accent-primary)]"
        >
          <option value="PRICE_ABOVE">Notify when YES ≥</option>
          <option value="PRICE_BELOW">Notify when YES ≤</option>
        </select>
        <input
          type="number"
          min={1}
          max={99}
          value={thresholdPct}
          onChange={(e) =>
            setThresholdPct(Math.max(1, Math.min(99, Number(e.target.value))))
          }
          className="w-16 bg-[var(--bg-elev)] border border-[var(--border)] px-2 py-1 text-xs text-right rounded-sm focus:outline-none focus:border-[var(--accent-primary)]"
        />
        <span className="text-xs text-[var(--fg-dim)]">%</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={status === "saving"}
          className="flex-1 px-2.5 py-1 text-[10px] uppercase tracking-wider bg-[var(--accent-primary)] text-black border border-[var(--accent-primary)] rounded-sm disabled:opacity-50"
        >
          {status === "saving"
            ? "Saving…"
            : status === "saved"
              ? "✓ Saved"
              : "Save Alert"}
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setStatus("idle");
            setError(null);
          }}
          className="px-2.5 py-1 text-[10px] uppercase tracking-wider border border-[var(--border)] text-[var(--fg-dim)] rounded-sm hover:text-[var(--fg)]"
        >
          Cancel
        </button>
      </div>
      {error && (
        <div className="mt-2 text-[10px] text-[var(--accent-down)]">
          {error}
        </div>
      )}
      <div className="mt-2 flex items-center gap-1.5">
        <span className="text-[10px] text-[var(--fg-dim)] tracking-wider uppercase">
          Notify via
        </span>
        <button
          onClick={() => setChannel("IN_APP")}
          className={`px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-sm border ${
            channel === "IN_APP"
              ? "bg-[var(--accent-primary)] text-black border-[var(--accent-primary)]"
              : "border-[var(--border)] text-[var(--fg-dim)] hover:text-[var(--fg)]"
          }`}
        >
          🔔 In-app
        </button>
        <button
          onClick={() => setChannel("EMAIL")}
          className={`px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-sm border ${
            channel === "EMAIL"
              ? "bg-[var(--accent-primary)] text-black border-[var(--accent-primary)]"
              : "border-[var(--border)] text-[var(--fg-dim)] hover:text-[var(--fg)]"
          }`}
        >
          ✉ Email
        </button>
      </div>
      <div className="mt-1 text-[10px] text-[var(--fg-dim)]">
        {channel === "IN_APP"
          ? "You'll see it in the bell at the top-right when the cron next fires."
          : `Email goes to ${process.env.NEXT_PUBLIC_ALERT_EMAIL_TO ?? "your address"}.`}
      </div>
    </div>
  );
}
