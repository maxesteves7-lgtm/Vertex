import { NextResponse } from "next/server";
import { fetchMacroTicker } from "@/lib/macro";

/**
 * GET /api/macro/ticker
 *
 * Returns the latest observations for the FRED macro ticker series (Fed
 * Funds, CPI YoY, 10Y, VIX, USD broad index).
 *
 * Response:
 *   {configured: true, ticks, failures?} when FRED_API_KEY is set
 *   {configured: false, ticks: []}       when the env var is missing
 *
 * The `failures` array surfaces per-series errors from FRED (bad key, bad
 * series ID, rate limit, etc.) so the ticker component can show a real
 * message instead of a silent empty state.
 */
export async function GET() {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { configured: false, ticks: [], failures: [] },
      {
        headers: {
          "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  }

  try {
    const { ticks, failures } = await fetchMacroTicker(apiKey);
    return NextResponse.json(
      { configured: true, ticks, failures },
      {
        headers: {
          "cache-control": "public, s-maxage=300, stale-while-revalidate=1800",
        },
      },
    );
  } catch (e) {
    return NextResponse.json(
      {
        configured: true,
        ticks: [],
        failures: [
          { id: "*", reason: e instanceof Error ? e.message : "FRED fetch failed" },
        ],
      },
      { status: 502 },
    );
  }
}
