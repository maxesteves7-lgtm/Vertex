import { loadScreenerRows } from "@/lib/screener";
import { getNewsForRows } from "@/lib/news";
import { fetchPolymarketTrades } from "@/lib/exchanges/polymarket";
import { CalendarView } from "@/components/CalendarView";

export const revalidate = 60;

export default async function CalendarPage() {
  const rows = await loadScreenerRows(200);
  const [news, trades] = await Promise.all([
    getNewsForRows(rows.map((r) => ({ id: r.id, question: r.question }))),
    fetchPolymarketTrades({ limit: 200, minSizeUsd: 1000 }).catch(() => []),
  ]);

  const withDate = rows.filter((r) => r.closesAt !== null).length;

  return (
    <main className="min-h-[calc(100vh-37px)] flex flex-col">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-1.5 text-[11px] text-[var(--fg-dim)]">
        <div className="flex items-center gap-4">
          <span className="text-[var(--fg)] uppercase tracking-wider text-[10px]">
            Resolution Calendar
          </span>
          <span>
            DATED{" "}
            <span className="text-[var(--accent-primary)] font-semibold">
              {withDate}
            </span>{" "}
            / {rows.length}
          </span>
        </div>
        <div className="font-mono">
          {new Date().toUTCString().slice(17, 25)} UTC
        </div>
      </div>

      <CalendarView rows={rows} news={news} trades={trades} />

      <footer className="border-t border-[var(--border)] px-4 py-1.5 text-[10px] uppercase tracking-wider text-[var(--fg-dim)] flex items-center justify-between">
        <span>GROUPED BY CLOSE DATE · SORTED ASC WITHIN EACH BUCKET</span>
        <span>auto-refresh 60s</span>
      </footer>
    </main>
  );
}
