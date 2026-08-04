"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase browser client. Cached per-tab via a module-level singleton so
 * we don't spin up multiple connections. `NEXT_PUBLIC_*` env vars are
 * embedded at build time and are safe to expose (they're the public keys).
 *
 * `isSupabaseConfigured` lets components render a "sign in disabled" state
 * when Max hasn't finished env-var setup yet, instead of crashing.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function supabaseBrowser() {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.",
    );
  }
  cached = createBrowserClient(url, anon);
  return cached;
}
