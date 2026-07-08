import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/notifications/mark-read
 *
 * Body: { id?: string, all?: boolean }
 *   - { id }   → mark one notification (by BigInt string id) as read
 *   - { all: true } → mark every unread notification for the current user as read
 *
 * Response: { updated: number }
 */
export async function POST(req: Request) {
  const userEmail = process.env.ALERT_EMAIL_TO;
  if (!userEmail) {
    return NextResponse.json({ updated: 0 });
  }

  let body: { id?: string; all?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is fine — treat as no-op */
  }

  const now = new Date();

  if (body.all) {
    const res = await prisma.notification.updateMany({
      where: { userEmail, readAt: null },
      data: { readAt: now },
    });
    return NextResponse.json({ updated: res.count });
  }

  if (body.id) {
    let idBig: bigint;
    try {
      idBig = BigInt(body.id);
    } catch {
      return NextResponse.json(
        { error: "invalid id" },
        { status: 400 },
      );
    }
    const res = await prisma.notification.updateMany({
      where: { id: idBig, userEmail, readAt: null },
      data: { readAt: now },
    });
    return NextResponse.json({ updated: res.count });
  }

  return NextResponse.json(
    { error: "provide { id } or { all: true }" },
    { status: 400 },
  );
}
