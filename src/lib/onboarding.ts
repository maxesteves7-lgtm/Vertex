/**
 * First-run onboarding tour "seen" state. Pure client-side; localStorage
 * only. If the key is absent, the tour opens automatically on first mount
 * of HomeView. Users can dismiss it forever with "Never show again", which
 * writes the completion flag.
 */

const KEY = "vertex.tour.completed.v1";

export function hasSeenTour(): boolean {
  if (typeof window === "undefined") return true; // don't auto-open on SSR
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

export function markTourSeen(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* ignore */
  }
}

export function resetTourSeen(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
