/**
 * User-defined screener presets — client-side persistence for the "MY
 * SCREENERS" sidebar section. Cap of 5 named presets, stored in
 * localStorage. Pure client logic; no server involvement.
 */

import type { Category } from "./categories";

export type ScreenerSource = "Polymarket" | "Kalshi" | "Both";

export type ScreenerFilter = {
  /** Empty = accept any source. */
  sources: ScreenerSource[];
  /** Empty = accept any category. */
  categories: Category[];
  /** Minimum 24h volume in USD; 0/undefined = no floor. */
  minVolume24h?: number;
  /** Only markets closing within this many days; undefined = no ceiling. */
  maxDaysToClose?: number;
  /** Yes-probability floor 0..1. undefined = no floor. */
  yesMin?: number;
  /** Yes-probability ceiling 0..1. undefined = no ceiling. */
  yesMax?: number;
};

export type SavedScreener = {
  id: string;
  name: string;
  createdAt: number;
  filter: ScreenerFilter;
};

const KEY = "vertex.screeners.v1";

export const MAX_SCREENERS = 5;

export function loadScreeners(): SavedScreener[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedScreener[];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_SCREENERS);
  } catch {
    return [];
  }
}

export function saveScreeners(list: SavedScreener[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_SCREENERS)));
  } catch {
    /* quota exceeded — ignore */
  }
}

export function upsertScreener(
  existing: SavedScreener[],
  next: SavedScreener,
): SavedScreener[] {
  const idx = existing.findIndex((s) => s.id === next.id);
  if (idx >= 0) {
    const copy = existing.slice();
    copy[idx] = next;
    return copy;
  }
  // Enforce the 5-preset cap on new adds — silently drop the request if
  // full so the caller doesn't have to check.
  if (existing.length >= MAX_SCREENERS) return existing;
  return [...existing, next];
}

export function deleteScreener(
  existing: SavedScreener[],
  id: string,
): SavedScreener[] {
  return existing.filter((s) => s.id !== id);
}

export function newScreenerId(): string {
  return `scr_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/**
 * Empty-shape filter used by the builder modal when creating a new preset
 * or seeding the form for "duplicate this one".
 */
export const emptyFilter: ScreenerFilter = {
  sources: [],
  categories: [],
};
