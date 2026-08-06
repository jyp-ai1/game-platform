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

export function authRedirectTo(path = "/auth/callback"): string {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

export async function getPlayerSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signInWithGoogle(): Promise<{ error: string | null }> {
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
