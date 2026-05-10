import { loadScreenerRows } from "@/lib/screener";
import { getNewsForRows } from "@/lib/news";
import { NewsFeed } from "@/components/NewsFeed";

export const revalidate = 60;

export default async function NewsPage() {
  const rows = await loadScreenerRows(120);
  const news = getNewsForRows(
    rows.map((r) => ({ id: r.id, question: r.question })),
  );
  // Build a quick lookup so the NewsFeed can render market chips
  const idToRow = Object.fromEntries(
    rows.map((r) => [r.id, { id: r.id, question: r.question, bucket: r.bucket }]),
  );

  return (
    <main className="min-h-[calc(100vh-37px)] flex flex-col">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-1.5 text-[11px] text-[var(--fg-dim)]">
        <div className="flex items-center gap-4">
          <span className="text-[var(--fg)] uppercase tracking-wider text-[10px]">
            News & Catalysts
          </span>
          <span>
            ITEMS{" "}
            <span className="text-[var(--accent-primary)] font-semibold">
              {news.length}
            </span>
          </span>
        </div>
        <div className="text-[var(--accent-amber)] text-[10px] uppercase tracking-wider">
          Seeded data · add NEWS_API_KEY for live feed
        </div>
      </div>

      <NewsFeed news={news} marketLookup={idToRow} />

      <footer className="border-t border-[var(--border)] px-4 py-1.5 text-[10px] uppercase tracking-wider text-[var(--fg-dim)] flex items-center justify-between">
        <span>SOURCES: REUTERS · AP · BLOOMBERG · FT · WSJ · COINDESK</span>
        <span>auto-refresh 60s</span>
      </footer>
    </main>
  );
}
