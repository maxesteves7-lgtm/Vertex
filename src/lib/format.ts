/**
 * Bloomberg-terminal-flavored formatters.
 * All functions return a string and never throw — null/undefined → "—".
 */

const DASH = "—";

export function fmtPct(price: number | null | undefined, digits = 1): string {
  if (price === null || price === undefined || !Number.isFinite(price))
    return DASH;
  return `${(price * 100).toFixed(digits)}%`;
}

export function fmtUsd(
  v: number | null | undefined,
  opts: { compact?: boolean } = {},
): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return DASH;
  if (opts.compact) {
    if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  }
  return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function fmtRelativeDate(d: Date | null | undefined): string {
  if (!d) return DASH;
  const now = Date.now();
  const diffMs = d.getTime() - now;
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days > 0 && days < 30) return `${days}d`;
  if (days >= 30 && days < 365) return `${Math.round(days / 30)}mo`;
  if (days >= 365) return `${Math.round(days / 365)}y`;
  return `${Math.abs(days)}d ago`;
}

/**
 * Smart trade/news timestamp.
 *  - under 60 minutes → exact clock time, e.g. "2:47 PM"
 *  - 1 hour to 7 days → day + time, e.g. "Mon 2:47 PM"
 *  - over 7 days     → full date + time, e.g. "Jun 12, 2:47 PM"
 * Always rendered in the user's local timezone.
 */
export function fmtSmartTime(d: Date | null | undefined): string {
  if (!d) return DASH;
  const now = Date.now();
  const diffMs = now - d.getTime();
  const oneHour = 60 * 60 * 1000;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (diffMs < oneHour) return time;
  if (diffMs < sevenDays) {
    const day = d.toLocaleDateString(undefined, { weekday: "short" });
    return `${day} ${time}`;
  }
  const date = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return `${date}, ${time}`;
}
