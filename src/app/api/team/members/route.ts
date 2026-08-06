import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  ensureOwnTeam,
  getTeamForMember,
  listInvites,
  listMembers,
  MAX_SEATS,
} from "@/lib/team";
import { getSubscription } from "@/lib/subscription";

/**
 * GET /api/team/members
 *
 * Returns the caller's team context: which team they're on (if any),
 * whether they're the owner, current members, pending invites, and seats
 * remaining. Used by the Team card in /account.
 *
 * If the caller is Institutional but has no team yet, we auto-create one
 * so the "Invite" form has something to hang off.
 */
export async function GET() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const sub = await getSubscription(user.email);
  const team =
    sub.tier === "institutional" && !sub.inheritedFrom
      ? await ensureOwnTeam(user.email)
      : await getTeamForMember(user.email);

  if (!team) {
    return NextResponse.json({
      team: null,
      isOwner: false,
      members: [],
      invites: [],
      seatsUsed: 0,
      seatsMax: MAX_SEATS,
    });
  }

  const [members, invites] = await Promise.all([
    listMembers(team.id),
    listInvites(team.id),
  ]);
  const seatsUsed = members.length + invites.length;

  return NextResponse.json({
    team,
    isOwner: team.ownerEmail.toLowerCase() === user.email.toLowerCase(),
    members,
    invites,
    seatsUsed,
    seatsMax: MAX_SEATS,
  });
}
