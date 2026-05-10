import { loadScreenerRows } from "@/lib/screener";
import { getNewsForRows } from "@/lib/news";
import { fetchPolymarketTrades } from "@/lib/exchanges/polymarket";
import { Screener } from "@/components/Screener";

export const revalidate = 30;

export default async function ScreenerPage() {
  const rows = await loadScreenerRows(120);
  const totalVolume = rows.reduce((acc, r) => acc + (r.volume24h ?? 0), 0);

  // Fetch supplementary feeds in parallel — both fail-safe
  const [news, trades] = await Promise.all([
    Promise.resolve(
      getNewsForRows(rows.map((r) => ({ id: r.id, question: r.question }))),
    ),
    fetchPolymarketTrades({ limit: 200, minSizeUsd: 1000 }).catch(() => []),
  ]);

  return (
    <main className="min-h-[calc(100vh-37px)] flex flex-col">
      {/* Sub-header bar with summary */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-1.5 text-[11px] text-[var(--fg-dim)]">
        <div className="flex items-center gap-4">
          <span className="text-[var(--fg)] uppercase tracking-wider text-[10px]">
            Cross-Exchange Screener
          </span>
          <span>
            VOL 24H{" "}
            <span className="text-[var(--accent-primary)] font-semibold">
              ${(totalVolume / 1_000_000).toFixed(1)}M
            </span>
          </span>
          <span>
            ROWS <span className="text-[var(--fg)]">{rows.length}</span>
          </span>
        </div>
        <div className="font-mono">{new Date().toUTCString().slice(17, 25)} UTC</div>
      </div>

      <Screener rows={rows} news={news} trades={trades} />

      <footer className="border-t border-[var(--border)] px-4 py-1.5 text-[10px] uppercase tracking-wider text-[var(--fg-dim)] flex items-center justify-between">
        <span>
          <span className="text-[var(--accent-primary)]">:</span> command bar
          coming next — keyboard navigation
        </span>
        <span>auto-refresh 30s</span>
      </footer>
    </main>
  );
}
