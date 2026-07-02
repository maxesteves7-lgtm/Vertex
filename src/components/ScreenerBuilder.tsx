"use client";

import { useEffect, useState } from "react";
import { CATEGORY_TREE, type Category } from "@/lib/categories";
import {
  MAX_SCREENERS,
  emptyFilter,
  newScreenerId,
  type SavedScreener,
  type ScreenerFilter,
  type ScreenerSource,
} from "@/lib/screeners";

const SOURCES: ScreenerSource[] = ["Polymarket", "Kalshi", "Both"];
const CLOSE_PRESETS: Array<{ label: string; days: number | undefined }> = [
  { label: "ANY", days: undefined },
  { label: "24H", days: 1 },
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
];

/**
 * Modal to create or edit a screener preset. Called from the sidebar's "+
 * NEW SCREENER" button and from clicking the pencil icon next to a saved
 * preset. Enforces the 5-preset cap upstream — this component just edits.
 */
export function ScreenerBuilder({
  existing,
  totalSaved,
  onSave,
  onClose,
}: {
  /** The preset being edited, or null when creating a new one. */
  existing: SavedScreener | null;
  /** Current count of saved presets — for the "N/5" indicator. */
  totalSaved: number;
  onSave: (preset: SavedScreener) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [filter, setFilter] = useState<ScreenerFilter>(
    existing?.filter ?? emptyFilter,
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggleSource(s: ScreenerSource) {
    setFilter((f) => ({
      ...f,
      sources: f.sources.includes(s)
        ? f.sources.filter((x) => x !== s)
        : [...f.sources, s],
    }));
  }

  function toggleCategory(c: Category) {
    setFilter((f) => ({
      ...f,
      categories: f.categories.includes(c)
        ? f.categories.filter((x) => x !== c)
        : [...f.categories, c],
    }));
  }

  const canSave = name.trim().length > 0;
  const atCap =
    !existing && totalSaved >= MAX_SCREENERS;

  function submit() {
    if (!canSave || atCap) return;
    const preset: SavedScreener = {
      id: existing?.id ?? newScreenerId(),
      name: name.trim(),
      createdAt: existing?.createdAt ?? Date.now(),
      filter: {
        ...filter,
        // Normalize numeric fields
        minVolume24h: filter.minVolume24h && filter.minVolume24h > 0
          ? filter.minVolume24h
          : undefined,
        yesMin: filter.yesMin !== undefined
          ? clamp01(filter.yesMin)
          : undefined,
        yesMax: filter.yesMax !== undefined
          ? clamp01(filter.yesMax)
          : undefined,
      },
    };
    onSave(preset);
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 z-40"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] max-w-[94vw] max-h-[86vh] overflow-auto bg-[var(--bg-elev)] border border-[var(--border)] rounded-sm z-50">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg)]">
          <div>
            <div className="font-mono text-[10px] tracking-[0.16em] text-[var(--fg-mute)]">
              {existing ? "EDIT SCREENER" : "NEW SCREENER"}
            </div>
            <div className="font-mono text-[10px] tracking-[0.12em] text-[var(--fg-mute)] mt-0.5">
              {totalSaved} / {MAX_SCREENERS} PRESETS
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--fg-dim)] hover:text-white text-lg leading-none w-6 h-6"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Name */}
          <Field label="NAME">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Crypto ≥ $50k · closing this week"
              className="w-full bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent-primary)] rounded-sm px-3 py-1.5 text-[13px] text-white placeholder:text-[var(--fg-mute)] outline-none"
              maxLength={80}
            />
          </Field>

          {/* Source */}
          <Field
            label="SOURCE"
            hint="none selected = any exchange"
          >
            <div className="flex flex-wrap gap-1.5">
              {SOURCES.map((s) => (
                <Chip
                  key={s}
                  active={filter.sources.includes(s)}
                  onClick={() => toggleSource(s)}
                >
                  {s.toUpperCase()}
                </Chip>
              ))}
            </div>
          </Field>

          {/* Category */}
          <Field
            label="CATEGORY"
            hint="none selected = any category"
          >
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_TREE.map((n) => (
                <Chip
                  key={n.bucket}
                  active={filter.categories.includes(n.bucket)}
                  onClick={() => toggleCategory(n.bucket)}
                >
                  {n.display.toUpperCase()}
                </Chip>
              ))}
            </div>
          </Field>

          {/* Min volume */}
          <Field label="MIN 24H VOLUME (USD)">
            <div className="flex items-center gap-2">
              <span className="text-[var(--fg-mute)] font-mono">$</span>
              <input
                type="number"
                min={0}
                step={1000}
                value={filter.minVolume24h ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setFilter((f) => ({
                    ...f,
                    minVolume24h: v === "" ? undefined : Number(v),
                  }));
                }}
                placeholder="0"
                className="flex-1 bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent-primary)] rounded-sm px-3 py-1.5 text-[13px] font-mono tabular-nums text-white placeholder:text-[var(--fg-mute)] outline-none"
              />
            </div>
          </Field>

          {/* Closes within */}
          <Field label="CLOSES WITHIN">
            <div className="flex gap-1.5">
              {CLOSE_PRESETS.map((p) => {
                const active = filter.maxDaysToClose === p.days;
                return (
                  <Chip
                    key={p.label}
                    active={active}
                    onClick={() =>
                      setFilter((f) => ({
                        ...f,
                        maxDaysToClose: p.days,
                      }))
                    }
                  >
                    {p.label}
                  </Chip>
                );
              })}
            </div>
          </Field>

          {/* Yes price range */}
          <Field
            label="YES PROBABILITY RANGE"
            hint="both blank = any price"
          >
            <div className="flex items-center gap-2 font-mono">
              <PctInput
                value={filter.yesMin}
                onChange={(v) =>
                  setFilter((f) => ({ ...f, yesMin: v }))
                }
                placeholder="0"
              />
              <span className="text-[var(--fg-mute)]">—</span>
              <PctInput
                value={filter.yesMax}
                onChange={(v) =>
                  setFilter((f) => ({ ...f, yesMax: v }))
                }
                placeholder="100"
              />
              <span className="text-[var(--fg-mute)] text-[12px]">%</span>
            </div>
          </Field>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-[var(--border)] bg-[var(--bg)]">
          {atCap ? (
            <span className="font-mono text-[10px] tracking-[0.12em] text-[var(--accent-down)]">
              PRESET CAP REACHED · DELETE ONE TO ADD NEW
            </span>
          ) : (
            <span className="font-mono text-[10px] tracking-[0.12em] text-[var(--fg-mute)]">
              ESC to cancel
            </span>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 border border-[var(--border)] rounded-sm font-mono text-[10px] tracking-[0.14em] text-[var(--fg-dim)] hover:text-white"
            >
              CANCEL
            </button>
            <button
              onClick={submit}
              disabled={!canSave || atCap}
              className="px-3 py-1.5 rounded-sm font-mono text-[10px] tracking-[0.14em] bg-[var(--accent-primary)] text-black hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {existing ? "UPDATE PRESET" : "SAVE PRESET"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="font-mono text-[10px] tracking-[0.16em] text-[var(--fg-mute)]">
          {label}
        </label>
        {hint && (
          <span className="font-mono text-[9px] tracking-[0.1em] text-[var(--fg-mute)] normal-case">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-sm font-mono text-[10px] tracking-[0.12em] border transition-colors ${
        active
          ? "bg-[var(--accent-primary)] text-black border-[var(--accent-primary)]"
          : "bg-[var(--bg)] text-[var(--fg-dim)] border-[var(--border)] hover:text-white hover:border-[var(--fg-mute)]"
      }`}
    >
      {children}
    </button>
  );
}

function PctInput({
  value,
  onChange,
  placeholder,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder: string;
}) {
  return (
    <input
      type="number"
      min={0}
      max={100}
      step={1}
      value={value !== undefined ? Math.round(value * 100) : ""}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "") onChange(undefined);
        else onChange(Number(v) / 100);
      }}
      placeholder={placeholder}
      className="w-16 bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent-primary)] rounded-sm px-2 py-1.5 text-[13px] font-mono tabular-nums text-white placeholder:text-[var(--fg-mute)] outline-none text-right"
    />
  );
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
