import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getSubscription } from "@/lib/subscription";

/**
 * GET /api/subscription
 *
 * Returns the current signed-in user's subscription info. Guest → free.
 * Used by client components (AiBrief, AccountPage, etc.) to gate features
 * without shipping subscription secrets to the browser.
 */
export async function GET() {
  try {
    const sb = await supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    const sub = await getSubscription(user?.email);
    return NextResponse.json({
      signedIn: !!user,
      email: user?.email ?? null,
      subscription: sub,
    });
  } catch (e) {
    // Never leak errors to the client for this route — fall back to free
    return NextResponse.json({
      signedIn: false,
      email: null,
      subscription: {
        tier: "free",
        status: "active",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
      error: e instanceof Error ? e.message : "unknown",
    });
  }
}
