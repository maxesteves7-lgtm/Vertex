import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getSubscription } from "@/lib/subscription";
import { getTeamForMember, removeMember } from "@/lib/team";

/**
 * DELETE /api/team/member?email=alice@example.com
 * Owner-only. Removes a member from the caller's team. Removing yourself
 * (the owner) is a no-op.
 */
export async function DELETE(req: Request) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const sub = await getSubscription(user.email);
  if (sub.tier !== "institutional" || sub.inheritedFrom) {
    return NextResponse.json(
      { error: "Only the team owner can remove members." },
      { status: 403 },
    );
  }

  const targetEmail = new URL(req.url).searchParams.get("email");
  if (!targetEmail) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const team = await getTeamForMember(user.email);
  if (!team) return NextResponse.json({ ok: true });
  await removeMember(team, targetEmail);
  return NextResponse.json({ ok: true });
}
