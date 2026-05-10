import { fetchPolymarketTrades } from "@/lib/exchanges/polymarket";
import { OrderFlowTape } from "@/components/OrderFlowTape";

export const revalidate = 10;

export default async function OrderFlowPage() {
  // Pull a wide superset; the client filters by min size
  const trades = await fetchPolymarketTrades({
    limit: 500,
    minSizeUsd: 500,
  }).catch(() => []);

  const totalNotional = trades.reduce((acc, t) => acc + t.sizeUsd, 0);

  return (
    <main className="min-h-[calc(100vh-37px)] flex flex-col">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-1.5 text-[11px] text-[var(--fg-dim)]">
        <div className="flex items-center gap-4">
          <span className="text-[var(--fg)] uppercase tracking-wider text-[10px]">
            Order Flow Tape
          </span>
          <span>
            TRADES{" "}
            <span className="text-[var(--accent-primary)] font-semibold">
              {trades.length}
            </span>
          </span>
          <span>
            NOTIONAL{" "}
            <span className="text-[var(--fg)]">
              ${(totalNotional / 1_000_000).toFixed(2)}M
            </span>
          </span>
        </div>
        <div className="font-mono">
          {new Date().toUTCString().slice(17, 25)} UTC
        </div>
      </div>

      <OrderFlowTape trades={trades} />

      <footer className="border-t border-[var(--border)] px-4 py-1.5 text-[10px] uppercase tracking-wider text-[var(--fg-dim)] flex items-center justify-between">
        <span>POLYMARKET FEED · KALSHI / RH PENDING CREDS</span>
        <span>auto-refresh 10s</span>
      </footer>
    </main>
  );
}
