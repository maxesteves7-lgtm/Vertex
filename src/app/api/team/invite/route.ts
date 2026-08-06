import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getSubscription } from "@/lib/subscription";
import { inviteMember, revokeInvite, getTeamForMember } from "@/lib/team";
import { sendEmail } from "@/lib/email";

/**
 * POST   /api/team/invite      — {email} to invite; owner-only
 * DELETE /api/team/invite?id=  — revoke a pending invite; owner-only
 *
 * The invite email includes the accept link with the single-use token so
 * the recipient can activate their seat with one click after signing in.
 */

async function requireOwner() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) {
    return {
      error: NextResponse.json({ error: "Not signed in" }, { status: 401 }),
    };
  }
  const sub = await getSubscription(user.email);
  if (sub.tier !== "institutional") {
    return {
      error: NextResponse.json(
        {
          error:
            "Team seats require the Institutional plan. Upgrade at /pricing.",
        },
        { status: 402 },
      ),
    };
  }
  if (sub.inheritedFrom) {
    return {
      error: NextResponse.json(
        {
          error:
            "You're a team member, not the owner. Ask the owner to manage invites.",
        },
        { status: 403 },
      ),
    };
  }
  return { email: user.email as string };
}

export async function POST(req: Request) {
  const auth = await requireOwner();
  if ("error" in auth) return auth.error;
  const ownerEmail = auth.email;

  const body = (await req.json().catch(() => ({}))) as { email?: unknown };
  const inviteeEmail = typeof body.email === "string" ? body.email : "";

  const result = await inviteMember(ownerEmail, inviteeEmail);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Send the invite email — non-fatal if it fails (owner can copy the link)
  const origin = new URL(req.url).origin;
  const acceptUrl = `${origin}/team/accept?token=${encodeURIComponent(result.token)}`;
  try {
    await sendEmail({
      to: inviteeEmail,
      subject: `${ownerEmail} invited you to their Futurist team`,
      html: inviteHtml({ ownerEmail, acceptUrl }),
    });
  } catch (e) {
    return NextResponse.json({
      invite: result.invite,
      acceptUrl,
      emailWarning:
        e instanceof Error
          ? `Email send failed (${e.message}). Copy the link below and send it manually.`
          : "Email send failed. Copy the link below and send it manually.",
    });
  }

  return NextResponse.json({ invite: result.invite, acceptUrl });
}

export async function DELETE(req: Request) {
  const auth = await requireOwner();
  if ("error" in auth) return auth.error;

  const inviteId = new URL(req.url).searchParams.get("id");
  if (!inviteId) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  // Get the owner's team so we scope the delete to their team only
  const team = await getTeamForMember(auth.email);
  if (!team) {
    return NextResponse.json({ ok: true });
  }
  await revokeInvite(team.id, inviteId);
  return NextResponse.json({ ok: true });
}

function inviteHtml(args: { ownerEmail: string; acceptUrl: string }): string {
  return `<!doctype html>
<html><body style="background:#000;color:#e8e8e8;font-family:Menlo,Consolas,monospace;padding:32px;">
  <div style="max-width:560px;margin:0 auto;border:1px solid #222;background:#0f0f0f;">
    <div style="padding:16px 20px;border-bottom:1px solid #222;">
      <span style="color:#ff6600;font-weight:bold;letter-spacing:0.3em;">FUTURIST</span>
      <span style="color:#999;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin-left:12px;">Team Invitation</span>
    </div>
    <div style="padding:20px;">
      <p style="font-size:14px;line-height:1.6;color:#e8e8e8;margin:0 0 12px;">
        <strong>${args.ownerEmail}</strong> invited you to their Futurist Institutional team.
      </p>
      <p style="font-size:13px;line-height:1.6;color:#a3a3a3;margin:0 0 20px;">
        Accepting gives you full Institutional-tier access — every filter,
        AI Overview, order flow, correlation heatmap, API keys, everything.
        No card required; the owner pays for the seat.
      </p>
      <a href="${args.acceptUrl}" style="display:inline-block;padding:10px 16px;background:#ff6600;color:#000;text-decoration:none;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-weight:600;">Accept Invitation →</a>
      <p style="font-size:11px;color:#666;margin-top:20px;">
        This link expires in 14 days and can only be used once. If you didn't expect this invitation, just ignore it.
      </p>
    </div>
    <div style="padding:12px 20px;border-top:1px solid #222;font-size:10px;color:#666;text-transform:uppercase;letter-spacing:0.1em;">
      Sent by Futurist · Team invitation
    </div>
  </div>
</body></html>`;
}
