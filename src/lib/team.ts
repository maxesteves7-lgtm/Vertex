import crypto from "node:crypto";
import { prisma } from "./prisma";

/**
 * Team management. Institutional owners can invite up to 4 additional
 * members (5 total seats). Members inherit the owner's Subscription tier
 * automatically via getSubscription — there's no separate Sub row per
 * member. Invitations are single-use tokens emailed to the recipient's
 * address and expire after 14 days.
 */

export const MAX_SEATS = 5;
export const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export type TeamShape = {
  id: string;
  ownerEmail: string;
  name: string;
};

export type MemberShape = {
  id: string;
  userEmail: string;
  joinedAt: string;
};

export type InviteShape = {
  id: string;
  email: string;
  token: string;
  expiresAt: string;
  createdAt: string;
};

/**
 * Returns the team the user is a MEMBER of (including owner). Null if the
 * user isn't attached to any team yet.
 */
export async function getTeamForMember(
  userEmail: string,
): Promise<TeamShape | null> {
  const membership = await prisma.teamMember.findFirst({
    where: { userEmail },
    include: { team: true },
  });
  if (!membership) {
    // Owner might exist without any TeamMember row (edge case pre-invite);
    // fall back to owner lookup.
    const owned = await prisma.team.findUnique({ where: { ownerEmail: userEmail } });
    if (owned) return owned;
    return null;
  }
  return membership.team;
}

/** Owner of the team the given user is on (or the user themselves if owner). */
export async function ownerOf(userEmail: string): Promise<string | null> {
  const team = await getTeamForMember(userEmail);
  return team?.ownerEmail ?? null;
}

/** Idempotent: returns the caller's Team, creating one on first invite. */
export async function ensureOwnTeam(
  ownerEmail: string,
  name: string = "My team",
): Promise<TeamShape> {
  const existing = await prisma.team.findUnique({ where: { ownerEmail } });
  if (existing) return existing;
  const team = await prisma.team.create({
    data: {
      ownerEmail,
      name,
      // Auto-add owner as their own first member so seat counts add up
      members: { create: { userEmail: ownerEmail } },
    },
  });
  return team;
}

export async function listMembers(teamId: string): Promise<MemberShape[]> {
  const rows = await prisma.teamMember.findMany({
    where: { teamId },
    orderBy: { joinedAt: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    userEmail: r.userEmail,
    joinedAt: r.joinedAt.toISOString(),
  }));
}

export async function listInvites(teamId: string): Promise<InviteShape[]> {
  const rows = await prisma.teamInvite.findMany({
    where: { teamId, acceptedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    token: r.token,
    expiresAt: r.expiresAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }));
}

/**
 * Count active seats currently on / pending on a team. Enforces the
 * MAX_SEATS cap. Owner counts, active members count, pending invites count.
 */
export async function activeSeatCount(teamId: string): Promise<number> {
  const [members, invites] = await Promise.all([
    prisma.teamMember.count({ where: { teamId } }),
    prisma.teamInvite.count({
      where: { teamId, acceptedAt: null, expiresAt: { gt: new Date() } },
    }),
  ]);
  return members + invites;
}

export type InviteResult =
  | { ok: true; invite: InviteShape; token: string }
  | { ok: false; error: string };

/** Create a new invitation. Enforces the 5-seat cap and deduplicates
 *  pending invites for the same email. */
export async function inviteMember(
  ownerEmail: string,
  inviteeEmail: string,
): Promise<InviteResult> {
  const email = inviteeEmail.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (email === ownerEmail.toLowerCase()) {
    return { ok: false, error: "You're already the team owner." };
  }

  const team = await ensureOwnTeam(ownerEmail);

  // Already a member?
  const existingMember = await prisma.teamMember.findFirst({
    where: { teamId: team.id, userEmail: email },
  });
  if (existingMember) {
    return { ok: false, error: `${email} is already on the team.` };
  }

  // Already invited?
  const existingInvite = await prisma.teamInvite.findFirst({
    where: {
      teamId: team.id,
      email,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (existingInvite) {
    return {
      ok: false,
      error: `${email} already has a pending invite. Revoke it first to re-send.`,
    };
  }

  const seats = await activeSeatCount(team.id);
  if (seats >= MAX_SEATS) {
    return {
      ok: false,
      error: `Team is at the ${MAX_SEATS}-seat cap. Remove a member or revoke a pending invite first.`,
    };
  }

  const token = crypto.randomBytes(24).toString("hex");
  const invite = await prisma.teamInvite.create({
    data: {
      teamId: team.id,
      email,
      token,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });

  return {
    ok: true,
    token,
    invite: {
      id: invite.id,
      email: invite.email,
      token: invite.token,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
    },
  };
}

export type AcceptResult =
  | { ok: true; teamId: string; teamName: string; ownerEmail: string }
  | { ok: false; error: string };

/**
 * Accept an invitation. Requires the recipient to be signed in — we compare
 * their email to the invite's email (case-insensitive). On success we
 * activate their membership and mark the invite consumed.
 */
export async function acceptInvite(
  token: string,
  userEmail: string,
): Promise<AcceptResult> {
  const invite = await prisma.teamInvite.findUnique({
    where: { token },
    include: { team: true },
  });
  if (!invite) return { ok: false, error: "Invite not found." };
  if (invite.acceptedAt) return { ok: false, error: "This invite was already used." };
  if (invite.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "This invite has expired." };
  }
  if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
    return {
      ok: false,
      error: `This invite is for ${invite.email}. Sign in with that address to accept.`,
    };
  }

  // Cap re-check (in case seats filled up while pending)
  const currentSeats = await activeSeatCount(invite.teamId);
  if (currentSeats > MAX_SEATS) {
    return { ok: false, error: "This team is full. Contact the owner." };
  }

  await prisma.$transaction([
    prisma.teamMember.upsert({
      where: {
        teamId_userEmail: { teamId: invite.teamId, userEmail },
      },
      create: { teamId: invite.teamId, userEmail },
      update: {},
    }),
    prisma.teamInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    }),
  ]);

  return {
    ok: true,
    teamId: invite.teamId,
    teamName: invite.team.name,
    ownerEmail: invite.team.ownerEmail,
  };
}

export async function revokeInvite(teamId: string, inviteId: string): Promise<void> {
  await prisma.teamInvite.deleteMany({ where: { id: inviteId, teamId } });
}

/** Owner-only. Silently no-op on removing the owner themselves. */
export async function removeMember(
  team: TeamShape,
  memberEmail: string,
): Promise<void> {
  if (memberEmail.toLowerCase() === team.ownerEmail.toLowerCase()) return;
  await prisma.teamMember.deleteMany({
    where: { teamId: team.id, userEmail: memberEmail },
  });
}
