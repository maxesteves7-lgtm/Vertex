/**
 * Theme (dark / light) persistence + application.
 *
 * The chosen theme is written to localStorage under `vertex.theme.v1` and
 * applied by toggling the `light` class on the root <html> element. A small
 * inline script in `app/layout.tsx` reads the same key before React
 * hydrates so first paint matches (no flash).
 */

export type Theme = "dark" | "light";

const KEY = "vertex.theme.v1";

export function getTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const t = localStorage.getItem(KEY);
    if (t === "light" || t === "dark") return t;
  } catch {
    /* ignore */
  }
  return "dark";
}

export function setTheme(theme: Theme): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* ignore */
  }
  applyTheme(theme);
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}

function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const cl = document.documentElement.classList;
  if (theme === "light") cl.add("light");
  else cl.remove("light");
}
