import { fetchPolymarketTrades } from "@/lib/exchanges/polymarket";
import { OrderFlowTape } from "@/components/OrderFlowTape";

export const revalidate = 10;

export default async function OrderFlowPage() {
  // Pull a deep window of trades; the tape filters client-side.
  // Min size 200 here so the client can drop down to "$500+" without hitting
  // a sparse server-side cutoff.
  const trades = await fetchPolymarketTrades({
    limit: 500,
    minSizeUsd: 200,
  }).catch(() => []);

  return (
    <main className="flex-1 flex flex-col min-h-[calc(100vh-56px)]">
      <OrderFlowTape trades={trades} />
    </main>
  );
}
