import { NextResponse } from "next/server";
import { resolveBearer } from "@/lib/apiKeys";
import { loadScreenerRows } from "@/lib/screener";

/**
 * GET /api/v1/markets
 * Auth: `Authorization: Bearer fk_...` (Institutional API key)
 *
 * Demo public API endpoint — returns the current cross-exchange scanner
 * feed as JSON. Auth is via Bearer token in the Authorization header.
 * This is the shape all future /api/v1/* endpoints will follow.
 *
 * Example:
 *   curl -H "Authorization: Bearer fk_abc..." \
 *        https://predix-max-s-projects25.vercel.app/api/v1/markets
 */
export const revalidate = 30;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth) {
    return NextResponse.json(
      {
        error:
          "Missing Authorization header. Format: `Authorization: Bearer fk_...`",
      },
      { status: 401 },
    );
  }
  const email = await resolveBearer(auth);
  if (!email) {
    return NextResponse.json(
      { error: "Invalid or revoked API key." },
      { status: 401 },
    );
  }

  const rows = await loadScreenerRows();
  return NextResponse.json({
    user: email,
    count: rows.length,
    markets: rows.map((r) => ({
      id: r.id,
      question: r.question,
      category: r.bucket,
      closesAt: r.closesAt?.toISOString() ?? null,
      volume24h: r.volume24h,
      liquidity: r.liquidity,
      polymarket: r.polymarket
        ? {
            yesPrice: r.polymarket.yesPrice,
            noPrice: r.polymarket.noPrice,
            volume24h: r.polymarket.volume24h,
            priceChange24h: r.polymarket.priceChange24h ?? null,
            url: r.polymarket.url,
          }
        : null,
      kalshi: r.kalshi
        ? {
            yesPrice: r.kalshi.yesPrice,
            noPrice: r.kalshi.noPrice,
            volume24h: r.kalshi.volume24h,
            priceChange24h: r.kalshi.priceChange24h ?? null,
            url: r.kalshi.url,
          }
        : null,
      spread: r.spread,
    })),
  });
}
