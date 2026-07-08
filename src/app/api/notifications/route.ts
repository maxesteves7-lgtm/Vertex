import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/notifications?limit=25
 *
 * Returns recent in-app notifications for the single-user email
 * (ALERT_EMAIL_TO). Sorted newest-first. Includes an `unread` count so the
 * bell in the top nav can show the badge without another round-trip.
 *
 * BigInt IDs are stringified before serialization because JSON.stringify
 * doesn't handle native BigInt.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.max(
    1,
    Math.min(100, parseInt(url.searchParams.get("limit") ?? "25", 10) || 25),
  );

  const userEmail = process.env.ALERT_EMAIL_TO;
  if (!userEmail) {
    return NextResponse.json(
      { notifications: [], unread: 0, configured: false },
      {
        headers: {
          "cache-control": "public, s-maxage=15, stale-while-revalidate=60",
        },
      },
    );
  }

  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userEmail },
      orderBy: { triggeredAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({
      where: { userEmail, readAt: null },
    }),
  ]);

  return NextResponse.json(
    {
      configured: true,
      unread,
      notifications: notifications.map((n) => ({
        id: n.id.toString(),
        title: n.title,
        body: n.body,
        marketQuestion: n.marketQuestion,
        externalUrl: n.externalUrl,
        triggeredAt: n.triggeredAt.toISOString(),
        readAt: n.readAt ? n.readAt.toISOString() : null,
      })),
    },
    {
      headers: {
        // Freshness matters — bell polls this every 30s
        "cache-control": "public, s-maxage=10, stale-while-revalidate=30",
      },
    },
  );
}
