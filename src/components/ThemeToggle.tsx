"use client";

import { useEffect, useState } from "react";
import { getTheme, toggleTheme, type Theme } from "@/lib/theme";

/**
 * Tiny sun/moon button in the top nav that flips between dark and light.
 * Mounts empty on the server (since theme lives in localStorage) and hydrates
 * to the actual value after mount — the anti-flash script in layout.tsx has
 * already applied the correct html class by then, so there's no visual jump.
 */
export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme | null>(null);

  useEffect(() => {
    setThemeState(getTheme());
  }, []);

  function onClick() {
    const next = toggleTheme();
    setThemeState(next);
  }

  const label = theme === "light" ? "Switch to dark mode" : "Switch to light mode";

  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-7 h-7 rounded-sm bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--fg-dim)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)] flex items-center justify-center text-[12px]"
    >
      {theme === "light" ? "☾" : "☀"}
    </button>
  );
}
