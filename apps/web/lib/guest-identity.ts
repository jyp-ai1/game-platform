/**
 * Guest identity — device-bound assets with Google merge path. Track C.
 */
import { getDeviceId } from "@game-platform/game-sdk";

const MERGED_KEY = "play29:guest-merged";
const GOOGLE_LINK_KEY = "play29:google-linked";

export interface GuestIdentity {
  guestId: string;
  linkedGoogle: boolean;
  mergedAt: string | null;
}

export function getGuestIdentity(): GuestIdentity {
  if (typeof window === "undefined") {
    return { guestId: "", linkedGoogle: false, mergedAt: null };
  }
  return {
    guestId: getDeviceId(),
    linkedGoogle: window.localStorage.getItem(GOOGLE_LINK_KEY) === "1",
    mergedAt: window.localStorage.getItem(MERGED_KEY),
  };
}

export function linkGoogleAccount(email: string): GuestIdentity {
  if (typeof window === "undefined") return getGuestIdentity();
  window.localStorage.setItem(GOOGLE_LINK_KEY, "1");
  window.localStorage.setItem("play29:google-email", email);
  return getGuestIdentity();
}

/** Merge guest localStorage assets into linked account (MVP: flag only). */
export function mergeGuestToAccount(): boolean {
  if (typeof window === "undefined") return false;
  const linked = window.localStorage.getItem(GOOGLE_LINK_KEY) === "1";
  if (!linked) return false;
  window.localStorage.setItem(MERGED_KEY, new Date().toISOString());
  return true;
}

export function getGuestAssetSummary(): {
  hasJourney: boolean;
  hasCollection: boolean;
  hasMissions: boolean;
} {
  if (typeof window === "undefined") {
    return { hasJourney: false, hasCollection: false, hasMissions: false };
  }
  return {
    hasJourney: !!window.localStorage.getItem("play29:play-history"),
    hasCollection: !!window.localStorage.getItem("play29:completed-games"),
    hasMissions: !!window.localStorage.getItem("play29:daily-mission"),
  };
}
