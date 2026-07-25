/**
 * Replay Passport — created on signup / first visit (Steam Library identity).
 */
import { getDeviceId } from "@game-platform/game-sdk";

const PASSPORT_KEY = "play29:replay-passport";

export interface PassportRecord {
  id: string;
  createdAt: string;
  mergedAccountId?: string;
  season: string;
}

function readPassport(): PassportRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PASSPORT_KEY);
    return raw ? (JSON.parse(raw) as PassportRecord) : null;
  } catch {
    return null;
  }
}

function writePassport(record: PassportRecord): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PASSPORT_KEY, JSON.stringify(record));
}

function currentSeason(): string {
  const d = new Date();
  return `${d.getFullYear()}-Q${Math.ceil((d.getMonth() + 1) / 3)}`;
}

/** Lazy-create passport on first visit — mirrors guest signup flow. */
export function ensureReplayPassport(): PassportRecord {
  const existing = readPassport();
  if (existing) return existing;

  const record: PassportRecord = {
    id: getDeviceId(),
    createdAt: new Date().toISOString(),
    season: currentSeason(),
  };
  writePassport(record);
  return record;
}

export function getReplayPassport(): PassportRecord | null {
  return readPassport();
}

/** Sprint17 stub — merge guest passport into Google account. */
export function mergePassportToAccount(accountId: string): void {
  const passport = ensureReplayPassport();
  writePassport({ ...passport, mergedAccountId: accountId });
}
