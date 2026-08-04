import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * OAuth + email-confirmation callback. Supabase redirects here with either
 * a `code` (OAuth PKCE) or a `token_hash` (email confirm / recovery). We
 * exchange whichever is present for a session, then redirect the user to
 * `next` (defaults to /account).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type"); // "signup" | "recovery" | ...
  const next = url.searchParams.get("next") ?? "/account";

  const sb = await supabaseServer();

  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
      );
    }
  } else if (tokenHash && type) {
    const { error } = await sb.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "signup" | "recovery" | "email_change",
    });
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
      );
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
