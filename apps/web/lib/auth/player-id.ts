/**
 * Platform player identity — prefer Supabase User ID when authenticated.
 * Guest fallback remains device_id (play29:device-id) for offline / pre-login play.
 *
 * Multiplayer room seats still use getDeviceId() until cloud sync migrates seats.
 */
import { getDeviceId } from "@game-platform/game-sdk";

const ACCOUNT_ID_KEY = "play29:account-id";
const ACCOUNT_EMAIL_KEY = "play29:google-email";

export function getStoredAccountId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCOUNT_ID_KEY);
}

export function setStoredAccountId(accountId: string | null, email?: string | null): void {
  if (typeof window === "undefined") return;
  if (!accountId) {
    window.localStorage.removeItem(ACCOUNT_ID_KEY);
    return;
  }
  window.localStorage.setItem(ACCOUNT_ID_KEY, accountId);
  if (email) window.localStorage.setItem(ACCOUNT_EMAIL_KEY, email);
}

/** Canonical player id for profile / journey / passport / rankings linkage. */
export function getPlayerId(): string {
  return getStoredAccountId() ?? getDeviceId();
}

export function isAuthenticatedPlayer(): boolean {
  return !!getStoredAccountId();
}
