"use client";

import { useEffect } from "react";
import { CATEGORY_TREE } from "@/lib/categories";
import {
  PRESETS,
  countActive,
  emptyFilters,
  type FiltersState,
  type FilterSource,
} from "@/lib/filters";

const SOURCES: FilterSource[] = ["Polymarket", "Kalshi", "Both"];

/** Common quick-price presets. Second value = "up to". */
const PRICE_CHIPS: Array<{ label: string; min?: number; max?: number }> = [
  { label: "<5%", max: 0.05 },
  { label: "5–15%", min: 0.05, max: 0.15 },
  { label: "15–40%", min: 0.15, max: 0.4 },
  { label: "40–60%", min: 0.4, max: 0.6 },
  { label: "60–85%", min: 0.6, max: 0.85 },
  { label: "85–95%", min: 0.85, max: 0.95 },
  { label: ">95%", min: 0.95 },
];

const VOLUME_CHIPS: Array<{ label: string; value?: number }> = [
  { label: "$0" },
  { label: "$1K", value: 1_000 },
  { label: "$5K", value: 5_000 },
  { label: "$10K", value: 10_000 },
  { label: "$50K", value: 50_000 },
  { label: "$100K", value: 100_000 },
];

const CLOSING_CHIPS: Array<{ label: string; days?: number }> = [
  { label: "24H", days: 1 },
  { label: "3D", days: 3 },
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];

/**
 * Slide-out right drawer with every filter control. Never blocks the whole
 * screen — the underlying scanner stays visible on the left so users can
 * see filter changes reflected instantly in the results count.
 */
export function FilterDrawer({
  open,
  onClose,
  filters,
  onChange,
  onApplyPreset,
  onClearAll,
}: {
  open: boolean;
  onClose: () => void;
  filters: FiltersState;
  onChange: (next: FiltersState) => void;
  onApplyPreset: (preset: FiltersState) => void;
  onClearAll: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function patch(update: Partial<FiltersState>) {
    onChange({ ...filters, ...update });
  }

  const active = countActive(filters);

  return (
    <>
      {/* Backdrop — semi-transparent, dismisses on click */}
      <div
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden
      />
      {/* Drawer — full-height right rail on desktop, bottom sheet on mobile */}
      <aside
        className={`fixed z-50 bg-[var(--bg-elev)] border-[var(--border)] transition-transform overflow-y-auto
          md:top-14 md:right-0 md:bottom-0 md:w-[380px] md:border-l
          max-md:left-0 max-md:right-0 max-md:bottom-0 max-md:h-[86vh] max-md:border-t max-md:rounded-t-lg
          ${
            open
              ? "translate-x-0 max-md:translate-y-0"
              : "md:translate-x-full max-md:translate-y-full"
          }`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--bg-elev)] border-b border-[var(--border)] px-4 py-2 flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] tracking-[0.18em] text-[var(--fg-mute)]">
              FILTERS {active > 0 ? `· ${active} ACTIVE` : ""}
            </div>
            <div className="font-mono text-[11px] text-[var(--fg-dim)]">
              Narrow the scanner in real time
            </div>
          </div>
          <div className="flex items-center gap-2">
            {active > 0 && (
              <button
                onClick={onClearAll}
                className="px-2 py-1 rounded-sm border border-[var(--border)] font-mono text-[10px] tracking-[0.14em] text-[var(--accent-down)] hover:border-[var(--accent-down)]"
              >
                CLEAR ALL
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-[var(--fg-dim)] hover:text-[var(--fg)] text-lg leading-none w-6 h-6 flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-5">
          {/* Presets */}
          <Section title="One-click presets">
            <div className="space-y-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onApplyPreset(p.filters)}
                  className="w-full text-left px-2.5 py-1.5 rounded-sm border border-[var(--border)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-row)] transition-colors"
                >
                  <div className="font-mono text-[11px] tracking-[0.08em] text-[var(--fg)]">
                    {p.label}
                  </div>
                  <div className="text-[11px] text-[var(--fg-dim)] mt-0.5">
                    {p.description}
                  </div>
                </button>
              ))}
            </div>
          </Section>

          {/* Price */}
          <Section title="YES probability">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {PRICE_CHIPS.map((c) => {
                const active =
                  filters.yesMin === c.min && filters.yesMax === c.max;
                return (
                  <Chip
                    key={c.label}
                    active={active}
                    onClick={() =>
                      active
                        ? patch({ yesMin: undefined, yesMax: undefined })
                        : patch({ yesMin: c.min, yesMax: c.max })
                    }
                  >
                    {c.label}
                  </Chip>
                );
              })}
            </div>
            <div className="flex items-center gap-2 font-mono">
              <PctInput
                value={filters.yesMin}
                onChange={(v) => patch({ yesMin: v })}
                placeholder="0"
              />
              <span className="text-[var(--fg-mute)]">–</span>
              <PctInput
                value={filters.yesMax}
                onChange={(v) => patch({ yesMax: v })}
                placeholder="100"
              />
              <span className="text-[var(--fg-mute)] text-[12px]">%</span>
            </div>
          </Section>

          {/* Price change */}
          <Section title="24h price change">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {[0.05, 0.1, 0.2].map((v) => (
                <Chip
                  key={v}
                  active={filters.priceChangeAbs === v}
                  onClick={() =>
                    patch({
                      priceChangeAbs:
                        filters.priceChangeAbs === v ? undefined : v,
                    })
                  }
                >
                  ≥ {Math.round(v * 100)}pp
                </Chip>
              ))}
              <label className="flex items-center gap-1.5 ml-2 text-[11px] font-mono text-[var(--fg-dim)]">
                custom
                <PctInput
                  value={
                    filters.priceChangeAbs !== undefined &&
                    ![0.05, 0.1, 0.2].includes(filters.priceChangeAbs)
                      ? filters.priceChangeAbs
                      : undefined
                  }
                  onChange={(v) => patch({ priceChangeAbs: v })}
                  placeholder=""
                />
                pp
              </label>
            </div>
            <div className="flex items-center gap-1.5">
              {(["any", "up", "down"] as const).map((d) => (
                <Chip
                  key={d}
                  active={(filters.priceChangeDir ?? "any") === d}
                  onClick={() => patch({ priceChangeDir: d })}
                >
                  {d === "any"
                    ? "EITHER"
                    : d === "up"
                      ? "▲ UP ONLY"
                      : "▼ DOWN ONLY"}
                </Chip>
              ))}
            </div>
          </Section>

          {/* Volume */}
          <Section title="Min 24h volume">
            <div className="flex flex-wrap gap-1.5">
              {VOLUME_CHIPS.map((c) => {
                const active =
                  (filters.minVolume24h ?? 0) === (c.value ?? 0);
                return (
                  <Chip
                    key={c.label}
                    active={active}
                    onClick={() => patch({ minVolume24h: c.value })}
                  >
                    {c.label}
                  </Chip>
                );
              })}
            </div>
          </Section>

          {/* Closing time */}
          <Section title="Closes within">
            <div className="flex flex-wrap gap-1.5 mb-2">
              <Chip
                active={filters.closingWithinDays === undefined}
                onClick={() => patch({ closingWithinDays: undefined })}
              >
                ANY
              </Chip>
              {CLOSING_CHIPS.map((c) => (
                <Chip
                  key={c.label}
                  active={filters.closingWithinDays === c.days}
                  onClick={() => patch({ closingWithinDays: c.days })}
                >
                  {c.label}
                </Chip>
              ))}
            </div>
            <label className="flex items-center gap-2 text-[12px] text-[var(--fg-dim)] cursor-pointer">
              <input
                type="checkbox"
                checked={!!filters.excludeClosingWithin24h}
                onChange={(e) =>
                  patch({ excludeClosingWithin24h: e.target.checked })
                }
                className="accent-[var(--accent-primary)]"
              />
              Exclude markets closing in the next 24h
            </label>
          </Section>

          {/* Platform */}
          <Section title="Platform">
            <div className="flex flex-wrap gap-1.5">
              {SOURCES.map((s) => {
                const active = filters.sources?.includes(s);
                return (
                  <Chip
                    key={s}
                    active={!!active}
                    onClick={() => {
                      const cur = filters.sources ?? [];
                      patch({
                        sources: active
                          ? cur.filter((x) => x !== s)
                          : [...cur, s],
                      });
                    }}
                  >
                    {s.toUpperCase()}
                  </Chip>
                );
              })}
            </div>
          </Section>

          {/* Category */}
          <Section
            title="Category"
            hint="click to include · shift-click to exclude"
          >
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_TREE.map((n) => {
                const included = filters.categories?.includes(n.bucket);
                const excluded = filters.excludeCategories?.includes(n.bucket);
                return (
                  <button
                    key={n.bucket}
                    onClick={(e) => {
                      const wantExclude = e.shiftKey;
                      const incs = filters.categories ?? [];
                      const excs = filters.excludeCategories ?? [];
                      if (wantExclude) {
                        patch({
                          excludeCategories: excluded
                            ? excs.filter((x) => x !== n.bucket)
                            : [...excs, n.bucket],
                          categories: incs.filter((x) => x !== n.bucket),
                        });
                      } else {
                        patch({
                          categories: included
                            ? incs.filter((x) => x !== n.bucket)
                            : [...incs, n.bucket],
                          excludeCategories: excs.filter(
                            (x) => x !== n.bucket,
                          ),
                        });
                      }
                    }}
                    className={`px-2.5 py-1 rounded-sm font-mono text-[10px] tracking-[0.12em] border transition-colors ${
                      included
                        ? "bg-[var(--accent-primary)] text-black border-[var(--accent-primary)]"
                        : excluded
                          ? "bg-[rgba(255,59,48,0.12)] text-[var(--accent-down)] border-[var(--accent-down)] line-through"
                          : "bg-[var(--bg)] text-[var(--fg-dim)] border-[var(--border)] hover:text-[var(--fg)]"
                    }`}
                  >
                    {n.display.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Structure */}
          <Section title="Market structure">
            <div className="flex flex-wrap gap-1.5">
              {(["any", "binary", "multi"] as const).map((s) => (
                <Chip
                  key={s}
                  active={(filters.structure ?? "any") === s}
                  onClick={() => patch({ structure: s })}
                >
                  {s === "any"
                    ? "ANY"
                    : s === "binary"
                      ? "BINARY"
                      : "MULTI-OUTCOME"}
                </Chip>
              ))}
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[var(--bg-elev)] border-t border-[var(--border)] px-4 py-2 flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-[0.14em] text-[var(--fg-mute)]">
            {emptyFilters === filters ? "" : "APPLIED IN REAL TIME"}
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-sm font-mono text-[10px] tracking-[0.14em] bg-[var(--accent-primary)] text-black hover:opacity-90"
          >
            DONE
          </button>
        </div>
      </aside>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small internals
// ─────────────────────────────────────────────────────────────────────────────

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="font-mono text-[10px] tracking-[0.16em] text-[var(--fg-mute)]">
          {title.toUpperCase()}
        </label>
        {hint && (
          <span className="font-mono text-[9px] tracking-[0.08em] text-[var(--fg-mute)] normal-case">
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
          : "bg-[var(--bg)] text-[var(--fg-dim)] border-[var(--border)] hover:text-[var(--fg)] hover:border-[var(--fg-mute)]"
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
      className="w-14 bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent-primary)] rounded-sm px-2 py-1 text-[12px] font-mono tabular-nums text-[var(--fg)] placeholder:text-[var(--fg-mute)] outline-none text-right"
    />
  );
}
