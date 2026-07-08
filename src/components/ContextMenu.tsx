"use client";

import { useEffect, useRef, useState } from "react";

export type ContextMenuItem = {
  key: string;
  label: string;
  icon?: string;
  onClick: () => void;
  /** Renders in red — used for destructive actions. */
  danger?: boolean;
  /** Disabled items render dim and skip onClick. */
  disabled?: boolean;
  /** Separator above this item. */
  separator?: boolean;
  /** Small right-aligned hint (keyboard shortcut, etc). */
  hint?: string;
};

/**
 * Right-click / context menu shell — floating, viewport-clamped, dismissed
 * on outside click or Escape. Consumer supplies `items`; menu positioning
 * happens client-side using the provided (x,y) coordinates.
 */
export function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x,
    y,
  });

  // Clamp within viewport after render so we don't clip off the edge
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 4;
    const maxX = window.innerWidth - rect.width - pad;
    const maxY = window.innerHeight - rect.height - pad;
    setPosition({
      x: Math.max(pad, Math.min(x, maxX)),
      y: Math.max(pad, Math.min(y, maxY)),
    });
  }, [x, y]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose();
    }
    window.addEventListener("keydown", onKey);
    // Use capture so we run before other click handlers
    window.addEventListener("mousedown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown, true);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      className="fixed z-50 min-w-[210px] bg-[var(--bg-elev)] border border-[var(--border)] rounded-sm shadow-2xl overflow-hidden"
      style={{ left: position.x, top: position.y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <ul className="py-1">
        {items.map((it) => (
          <li key={it.key}>
            {it.separator && (
              <div className="h-px bg-[var(--border)] my-1" />
            )}
            <button
              onClick={() => {
                if (it.disabled) return;
                it.onClick();
                onClose();
              }}
              disabled={it.disabled}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-mono tracking-[0.06em] text-left transition-colors ${
                it.disabled
                  ? "text-[var(--fg-mute)] cursor-not-allowed"
                  : it.danger
                    ? "text-[var(--accent-down)] hover:bg-[var(--bg-row)]"
                    : "text-[var(--fg)] hover:bg-[var(--bg-row)] hover:text-[var(--fg)]"
              }`}
            >
              {it.icon && (
                <span className="w-4 text-center text-[var(--fg-mute)]">
                  {it.icon}
                </span>
              )}
              <span className="flex-1">{it.label}</span>
              {it.hint && (
                <span className="text-[10px] text-[var(--fg-mute)]">
                  {it.hint}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
