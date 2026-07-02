import { HeatmapView } from "@/components/HeatmapView";
import { Suspense } from "react";

export const revalidate = 60;

export default function HeatmapPage() {
  return (
    <main className="flex-1 flex flex-col min-h-[calc(100vh-48px)]">
      <Suspense
        fallback={
          <div className="p-6 font-mono text-[11px] tracking-[0.12em] text-[var(--fg-dim)]">
            LOADING HEATMAP…
          </div>
        }
      >
        <HeatmapView />
      </Suspense>
    </main>
  );
}
