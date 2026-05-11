import { NextResponse } from "next/server";
import { createAlert, listAlerts } from "@/lib/alerts";

/**
 * GET  /api/alerts            — list all alerts
 * POST /api/alerts            — create one. Body: {exchange, externalMarketId, marketQuestion, ruleType, threshold}
 */

export async function GET() {
  try {
    const alerts = await listAlerts();
    return NextResponse.json({ alerts });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      exchange?: string;
      externalMarketId?: string;
      marketQuestion?: string;
      ruleType?: string;
      threshold?: number;
    };
    if (
      !body.exchange ||
      !body.externalMarketId ||
      !body.marketQuestion ||
      !body.ruleType ||
      typeof body.threshold !== "number"
    ) {
      return NextResponse.json(
        { error: "missing required fields" },
        { status: 400 },
      );
    }
    if (body.exchange !== "POLYMARKET" && body.exchange !== "KALSHI") {
      return NextResponse.json({ error: "bad exchange" }, { status: 400 });
    }
    if (body.ruleType !== "PRICE_ABOVE" && body.ruleType !== "PRICE_BELOW") {
      return NextResponse.json({ error: "bad ruleType" }, { status: 400 });
    }
    if (body.threshold < 0 || body.threshold > 1) {
      return NextResponse.json(
        { error: "threshold must be 0..1" },
        { status: 400 },
      );
    }
    const alert = await createAlert({
      exchange: body.exchange,
      externalMarketId: body.externalMarketId,
      marketQuestion: body.marketQuestion,
      ruleType: body.ruleType,
      threshold: body.threshold,
    });
    return NextResponse.json({ alert });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
