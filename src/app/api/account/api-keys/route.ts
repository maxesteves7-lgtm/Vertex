import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getSubscription } from "@/lib/subscription";
import { issueKey, listKeys, revokeKey } from "@/lib/apiKeys";

/**
 * GET    /api/account/api-keys           — list your keys (no plaintext)
 * POST   /api/account/api-keys           — issue a new key {name} → returns plaintext ONCE
 * DELETE /api/account/api-keys?id=...    — revoke a key
 *
 * All operations require an authenticated Institutional-tier user; other
 * tiers get 402 with an upgrade pointer.
 */

async function requireInstitutional() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) {
    return {
      error: NextResponse.json({ error: "Not signed in" }, { status: 401 }),
      email: null as string | null,
    };
  }
  const sub = await getSubscription(user.email);
  if (sub.tier !== "institutional") {
    return {
      error: NextResponse.json(
        {
          error: "API keys are an Institutional-tier feature. See /pricing.",
          upgradeUrl: "/pricing",
        },
        { status: 402 },
      ),
      email: user.email,
    };
  }
  return { error: null, email: user.email };
}

export async function GET() {
  const { error, email } = await requireInstitutional();
  if (error || !email) return error!;
  const keys = await listKeys(email);
  return NextResponse.json({ keys });
}

export async function POST(req: Request) {
  const { error, email } = await requireInstitutional();
  if (error || !email) return error!;

  const body = (await req.json().catch(() => ({}))) as { name?: unknown };
  const name = typeof body.name === "string" ? body.name : "Untitled";
  const issued = await issueKey(email, name);
  return NextResponse.json({ key: issued });
}

export async function DELETE(req: Request) {
  const { error, email } = await requireInstitutional();
  if (error || !email) return error!;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id query param required" }, { status: 400 });
  }
  await revokeKey(email, id);
  return NextResponse.json({ ok: true });
}
