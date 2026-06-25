import { Suspense } from "react";
import { loadScreenerRows } from "@/lib/screener";
import { getNewsForRows } from "@/lib/news";
import { fetchPolymarketTrades } from "@/lib/exchanges/polymarket";
import { HomeView } from "@/components/HomeView";

export const revalidate = 30;

export default async function MarketsPage() {
  const rows = await loadScreenerRows(); // pulls ALL active Polymarket + Kalshi events

  // Supplementary feeds — both fail-safe so a slow side never blocks the grid
  const [news, trades] = await Promise.all([
    getNewsForRows(rows.map((r) => ({ id: r.id, question: r.question }))),
    fetchPolymarketTrades({ limit: 200, minSizeUsd: 1000 }).catch(() => []),
  ]);

  return (
    <Suspense fallback={null}>
      <HomeView rows={rows} news={news} trades={trades} />
    </Suspense>
  );
}
