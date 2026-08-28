/**
 * RC-AUTH-001 — Player auth helpers (Supabase Google OAuth).
 * Admin auth stays separate (`/admin`).
 */
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/client";
import { linkGoogleAccount, mergeGuestToAccount } from "@/lib/guest-identity";
import { markJourneyMerged } from "@/lib/journey-profile";
import { mergePassportToAccount } from "@/lib/passport-store";
import { setStoredAccountId } from "@/lib/auth/player-id";

export type PlayerAuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

const AUTH_RETURN_KEY = "play29:auth-return-to";

export function authRedirectTo(path = "/auth/callback"): string {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

/** Preserve Preview origin path before OAuth redirect. */
export function storeAuthReturnPath(path?: string): void {
  if (typeof window === "undefined") return;
  const target = path ?? `${window.location.pathname}${window.location.search}`;
  try {
    sessionStorage.setItem(AUTH_RETURN_KEY, target);
  } catch {
    /* ignore */
  }
}

export function consumeAuthReturnPath(): string {
  if (typeof window === "undefined") return "/profile";
  try {
    const stored = sessionStorage.getItem(AUTH_RETURN_KEY);
    sessionStorage.removeItem(AUTH_RETURN_KEY);
    if (stored && stored.startsWith("/")) return stored;
  } catch {
    /* ignore */
  }
  return "/profile";
}

export async function getPlayerSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signInWithGoogle(): Promise<{ error: string | null }> {
  storeAuthReturnPath();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: authRedirectTo("/auth/callback"),
      queryParams: { access_type: "offline", prompt: "select_account" },
    },
  });
  return { error: error?.message ?? null };
}

export async function signOutPlayer(): Promise<void> {
  await supabase.auth.signOut();
  setStoredAccountId(null);
}

/** Guest → authenticated merge (local progress flags + canonical User ID). */
export function applyGuestAuthMerge(user: User): void {
  const email = user.email ?? user.id;
  setStoredAccountId(user.id, email);
  linkGoogleAccount(email);
  mergeGuestToAccount();
  markJourneyMerged(user.id);
  mergePassportToAccount(user.id);
}

export function displayNameFromUser(user: User | null): string {
  if (!user) return "Guest";
  const meta = user.user_metadata as { full_name?: string; name?: string } | undefined;
  return meta?.full_name || meta?.name || user.email?.split("@")[0] || "Player";
}

/** Google / OAuth avatar URL when present (basic profile image). */
export function avatarUrlFromUser(user: User | null): string | null {
  if (!user) return null;
  const meta = user.user_metadata as { avatar_url?: string; picture?: string } | undefined;
  const url = meta?.avatar_url || meta?.picture || null;
  return typeof url === "string" && url.startsWith("http") ? url : null;
}
