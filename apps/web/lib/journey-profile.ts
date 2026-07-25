/**
 * Guest journey identity — device_id today, merge-ready for Sprint17 login.
 * Keys use play29: prefix (same as game-sdk local storage convention).
 */
import { getDeviceId } from "@game-platform/game-sdk";

const JOURNEY_KEY = "play29:journey-profile";

export interface JourneyProfile {
  schemaVersion: 1;
  /** Same as game-sdk device_id until account merge. */
  guestId: string;
  createdAt: string;
  /** Set when Google login merges guest data (Sprint17). */
  mergedAccountId: string | null;
}

type Listener = () => void;

let cache: JourneyProfile | null = null;
const listeners = new Set<Listener>();

function read(): JourneyProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(JOURNEY_KEY);
    return raw ? (JSON.parse(raw) as JourneyProfile) : null;
  } catch {
    return null;
  }
}

function write(profile: JourneyProfile): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(JOURNEY_KEY, JSON.stringify(profile));
}

function notify(): void {
  for (const l of listeners) l();
}

export function getJourneyProfileSnapshot(): JourneyProfile | null {
  return cache;
}

const EMPTY_JOURNEY: JourneyProfile | null = null;

export function getServerJourneyProfileSnapshot(): JourneyProfile | null {
  return EMPTY_JOURNEY;
}

export function subscribeJourneyProfile(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Ensure a journey exists for this guest (lazy init on first play). */
export function ensureJourneyProfile(): JourneyProfile {
  if (cache) return cache;

  const existing = read();
  if (existing) {
    cache = existing;
    return existing;
  }

  const guestId = getDeviceId();
  const profile: JourneyProfile = {
    schemaVersion: 1,
    guestId,
    createdAt: new Date().toISOString(),
    mergedAccountId: null,
  };
  cache = profile;
  write(profile);
  notify();
  return profile;
}

/** Sprint17 — merge guest journey into authenticated account. */
export function markJourneyMerged(accountId: string): void {
  const profile = ensureJourneyProfile();
  if (profile.mergedAccountId === accountId) return;
  cache = { ...profile, mergedAccountId: accountId };
  write(cache);
  notify();
}

// Hydrate cache on module load (client only).
if (typeof window !== "undefined") {
  cache = read();
}
