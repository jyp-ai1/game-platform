/**
 * Supabase client factory for multiplayer transport (browser-only).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  interface Window {
    __gamePlatformSupabase?: SupabaseClient;
  }
}

let client: SupabaseClient | null = null;

export function registerMultiplayerSupabase(existing: SupabaseClient): void {
  client = existing;
  if (typeof window !== "undefined") {
    window.__gamePlatformSupabase = existing;
  }
}

export function getMultiplayerSupabase(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (window.__gamePlatformSupabase) return window.__gamePlatformSupabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key);
    window.__gamePlatformSupabase = client;
  }
  return client;
}

export function isSupabaseRealtimeConfigured(): boolean {
  return Boolean(
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
