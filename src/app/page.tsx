import { Suspense } from "react";
import { loadScreenerRows } from "@/lib/screener";
import { getNewsForRows } from "@/lib/news";
import { fetchPolymarketTrades } from "@/lib/exchanges/polymarket";
import { HomeView } from "@/components/HomeView";
import { CardGridSkeleton } from "@/components/Skeleton";

export const revalidate = 30;

export default async function MarketsPage() {
  return (
    <Suspense fallback={<CardGridSkeleton count={9} />}>
      <MarketsInner />
    </Suspense>
  );
}

async function MarketsInner() {
  const rows = await loadScreenerRows(); // pulls ALL active Polymarket + Kalshi events

  // If either exchange returned zero rows, surface a non-blocking banner.
  const hasPoly = rows.some((r) => r.polymarket);
  const hasKalshi = rows.some((r) => r.kalshi);
  const missing: Array<"Polymarket" | "Kalshi"> = [];
  if (!hasPoly) missing.push("Polymarket");
  if (!hasKalshi) missing.push("Kalshi");

  const [news, trades] = await Promise.all([
    getNewsForRows(rows.map((r) => ({ id: r.id, question: r.question }))),
    fetchPolymarketTrades({ limit: 200, minSizeUsd: 1000 }).catch(() => []),
  ]);

  return (
    <HomeView rows={rows} news={news} trades={trades} missing={missing} />
  );
}
