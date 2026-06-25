import { fetchPolymarketResolved } from "@/lib/exchanges/polymarket";
import { ResolutionTracker } from "@/components/ResolutionTracker";

export const revalidate = 120;

export default async function ResolvedPage() {
  const resolved = await fetchPolymarketResolved(150).catch(() => []);
  return (
    <main className="flex-1 flex flex-col min-h-[calc(100vh-56px)]">
      <ResolutionTracker resolved={resolved} />
    </main>
  );
}
