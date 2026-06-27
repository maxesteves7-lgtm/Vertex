import type { ScreenerRow } from "./exchanges/types";

/**
 * Trigger a client-side CSV download for the given screener rows.
 * Columns mirror the dense Scanner panel so users can drop the file
 * straight into Excel / a Jupyter notebook / a data warehouse.
 */
export function exportRowsToCsv(rows: ScreenerRow[], filename: string): void {
  const header = [
    "id",
    "question",
    "category",
    "source",
    "yes_price",
    "no_price",
    "delta_24h",
    "polymarket_yes",
    "polymarket_no",
    "polymarket_vol_24h",
    "polymarket_url",
    "kalshi_yes",
    "kalshi_no",
    "kalshi_vol_24h",
    "kalshi_url",
    "spread",
    "total_volume_24h",
    "liquidity",
    "closes_at",
  ];

  const lines: string[] = [header.join(",")];
  for (const r of rows) {
    const source =
      r.polymarket?.yesPrice != null && r.kalshi?.yesPrice != null
        ? "Both"
        : r.polymarket?.yesPrice != null
          ? "Polymarket"
          : r.kalshi?.yesPrice != null
            ? "Kalshi"
            : "—";
    const yes = r.polymarket?.yesPrice ?? r.kalshi?.yesPrice ?? null;
    const no = r.polymarket?.noPrice ?? r.kalshi?.noPrice ?? null;
    const delta =
      r.polymarket?.priceChange24h ?? r.kalshi?.priceChange24h ?? null;
    const cells = [
      r.id,
      r.question,
      r.bucket,
      source,
      yes,
      no,
      delta,
      r.polymarket?.yesPrice ?? "",
      r.polymarket?.noPrice ?? "",
      r.polymarket?.volume24h ?? "",
      r.polymarket?.url ?? "",
      r.kalshi?.yesPrice ?? "",
      r.kalshi?.noPrice ?? "",
      r.kalshi?.volume24h ?? "",
      r.kalshi?.url ?? "",
      r.spread ?? "",
      r.volume24h ?? "",
      r.liquidity ?? "",
      r.closesAt ? r.closesAt.toISOString() : "",
    ];
    lines.push(cells.map(csvCell).join(","));
  }

  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Escape a single CSV cell — wraps in quotes if it contains commas, quotes,
 *  newlines, or other CSV-hostile characters. */
function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[,\n"\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
