import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Middleware — runs on every matched request. Its ONLY job is to refresh
 * the Supabase auth session cookie if it's near expiry, and forward the
 * request untouched otherwise.
 *
 * We intentionally do NOT gate any route here. The app is fully browsable
 * as a guest; auth-gated features (account settings, per-user data) check
 * user presence themselves and redirect to /login when appropriate.
 *
 * If Supabase env vars aren't set, this middleware becomes a no-op so
 * Max can deploy without configuring auth immediately.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(list: CookieToSet[]) {
        for (const { name, value } of list) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Touch the session so @supabase/ssr writes a refreshed cookie if needed
  await supabase.auth.getUser();

  return response;
}

// Exclude static assets, API routes, and images from middleware.
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static  (build assets)
     * - _next/image   (image optimizer)
     * - favicon.ico   (root)
     * - api/*         (own auth-header check where needed)
     * - *.{svg,png,jpg,ico,webp}   (static images)
     */
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
