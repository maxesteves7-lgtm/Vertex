import { NextResponse } from "next/server";
import { fetchMacroTicker } from "@/lib/macro";

/**
 * GET /api/macro/ticker
 *
 * Returns the latest observations for the FRED macro ticker series (Fed
 * Funds, CPI YoY, 10Y, VIX, USD broad index).
 *
 * Response:
 *   {configured: true, ticks: MacroTick[]} when FRED_API_KEY is set
 *   {configured: false, ticks: []}         when the env var is missing
 *
 * The ticker component uses `configured` to render a small setup hint
 * instead of an error state.
 */
export async function GET() {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { configured: false, ticks: [] },
      {
        headers: {
          // No key = no data; cache briefly so we don't hammer this route
          "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  }

  try {
    const ticks = await fetchMacroTicker(apiKey);
    return NextResponse.json(
      { configured: true, ticks },
      {
        headers: {
          // Macro data updates infrequently (daily/monthly); 5-minute
          // shared cache with 30-minute SWR is plenty fresh
          "cache-control": "public, s-maxage=300, stale-while-revalidate=1800",
        },
      },
    );
  } catch (e) {
    return NextResponse.json(
      {
        configured: true,
        ticks: [],
        error: e instanceof Error ? e.message : "FRED fetch failed",
      },
      { status: 502 },
    );
  }
}
