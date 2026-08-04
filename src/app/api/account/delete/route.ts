import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/account/delete
 *
 * Deletes the calling user's account. Requires SUPABASE_SERVICE_ROLE_KEY
 * because auth.admin.deleteUser is a privileged endpoint. Also cleans up
 * server-side data tied to the user's email (Alerts + Notifications) to
 * satisfy GDPR right-to-erasure.
 */
export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      {
        error:
          "Server missing SUPABASE_SERVICE_ROLE_KEY — cannot delete users without admin credentials.",
      },
      { status: 501 },
    );
  }

  // Identify caller from their session cookie
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const email = user.email;

  // Wipe server-side data keyed on this email. Alert.destination is the
  // canonical single-user identifier the alerts checker uses; wiping alerts
  // cascades to their Notifications via the FK.
  if (email) {
    try {
      await prisma.alert.deleteMany({ where: { destination: email } });
      await prisma.notification.deleteMany({ where: { userEmail: email } });
    } catch (e) {
      // Prisma failure shouldn't block the auth delete — log-only
      console.error("[account/delete] Prisma wipe failed:", e);
    }
  }

  // Delete the auth user via the admin client
  const admin = createClient(url, serviceKey);
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json(
      { error: `Auth deletion failed: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
