import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { acceptInvite } from "@/lib/team";

/**
 * POST /api/team/accept
 * Body: { token: string }
 *
 * Confirms an invitation for the signed-in user. Called from /team/accept
 * page after auth is established. The GET-based accept-via-link pattern
 * gets brittle when the user isn't already signed in — the page handles
 * the "sign in and come back" flow, and then this endpoint activates.
 */
export async function POST(req: Request) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) {
    return NextResponse.json(
      { ok: false, error: "Sign in to accept the invitation." },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { token?: unknown };
  const token = typeof body.token === "string" ? body.token : "";
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing token." },
      { status: 400 },
    );
  }

  const result = await acceptInvite(token, user.email);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    teamName: result.teamName,
    ownerEmail: result.ownerEmail,
  });
}
