import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Supabase server client for use inside Server Components, Server Actions,
 * and Route Handlers. Reads/writes the session cookie via next/headers so
 * auth state survives across requests.
 *
 * NOTE: In Server Components (read-only rendering) the `set` callback will
 * throw silently on newer Next versions — this is expected. The middleware
 * handles all session refresh writes; Server Components only ever read.
 */
export async function supabaseServer() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.",
    );
  }
  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(list: CookieToSet[]) {
        try {
          for (const { name, value, options } of list) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render — safe to ignore.
          // Middleware will refresh the cookie on the next request.
        }
      },
    },
  });
}

/**
 * True when both public env vars are present. Lets pages / route handlers
 * return a helpful "not configured yet" response instead of crashing.
 */
export function isSupabaseConfiguredServer(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
