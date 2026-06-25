/**
 * Loading skeletons. Server components so they render instantly while the
 * real data is still being fetched.
 */

export function CardGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <main className="flex-1 flex">
      <div className="w-60 shrink-0 border-r border-[var(--border)] py-4 px-3 hidden md:block">
        <div className="h-3 w-16 bg-[var(--bg-elev)] rounded mb-3" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-7 bg-[var(--bg-elev)] rounded-md animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      </div>

      <section className="flex-1 min-w-0 px-4 md:px-6 py-5">
        <div className="h-6 w-44 bg-[var(--bg-elev)] rounded mb-2 animate-pulse" />
        <div className="h-3 w-60 bg-[var(--bg-elev)] rounded mb-5 animate-pulse" />

        <div className="flex gap-2 mb-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-7 w-20 bg-[var(--bg-elev)] rounded-full animate-pulse"
            />
          ))}
        </div>

        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="bg-[var(--bg-elev)] border border-[var(--border-soft)] rounded-xl p-4 h-44 animate-pulse"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="h-3 w-16 bg-[var(--bg-row)] rounded mb-3" />
              <div className="h-3 w-full bg-[var(--bg-row)] rounded mb-2" />
              <div className="h-3 w-3/4 bg-[var(--bg-row)] rounded mb-4" />
              <div className="h-2 w-full bg-[var(--bg-row)] rounded" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export function ExchangeDownBanner({
  missing,
}: {
  missing: Array<"Polymarket" | "Kalshi">;
}) {
  if (missing.length === 0) return null;
  return (
    <div className="mb-4 rounded-lg border border-[var(--accent-amber)]/40 bg-[rgba(245,158,11,0.08)] px-4 py-2.5 text-[12px] text-[var(--accent-amber)] flex items-center gap-2">
      <span>⚠</span>
      <span>
        Live data for{" "}
        <span className="font-semibold">{missing.join(" and ")}</span> is
        currently unavailable. Other markets are still up to date.
      </span>
    </div>
  );
}
