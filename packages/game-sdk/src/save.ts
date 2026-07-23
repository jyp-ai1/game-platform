// Shared save/resume system — every game reads/writes progress exclusively
// through this module (never touching localStorage directly). Each game
// owns its own serializable reducer state; this module owns persistence,
// versioning, and per-slug reactivity.
import { getDeviceId } from "./local-storage";
import { emitPlatformAnalyticsEvent } from "./platform-analytics";

const SAVE_KEY_PREFIX = "play29:save:";

export const SAVE_VERSION = 2;

export interface SaveEnvelope<T = unknown> {
  version: number;
  updatedAt: string;
  /** Which device wrote this save — Cloud Save (Sprint 11) needs this to
   * resolve multi-device conflicts; added in v2. */
  deviceId: string;
  state: T;
}

function saveKey(slug: string): string {
  return `${SAVE_KEY_PREFIX}${slug}`;
}

function readEnvelope(slug: string): SaveEnvelope | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(saveKey(slug));
    return raw ? (JSON.parse(raw) as SaveEnvelope) : null;
  } catch {
    return null;
  }
}

function writeEnvelope(slug: string, envelope: SaveEnvelope): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(saveKey(slug), JSON.stringify(envelope));
  }
}

// Migrations keyed by "version to migrate FROM". v1 envelopes predate the
// deviceId field — backfill it from this device's id (the only reasonable
// value: a v1 save was, by definition, written by whichever device is
// loading it now, since Sprint 9 had no cross-device sync).
const MIGRATIONS: Record<number, (envelope: SaveEnvelope) => SaveEnvelope> = {
  1: (envelope) => ({ ...envelope, version: 2, deviceId: getDeviceId() }),
};

function migrate(envelope: SaveEnvelope): SaveEnvelope | null {
  let current = envelope;
  while (current.version < SAVE_VERSION) {
    const step = MIGRATIONS[current.version];
    if (!step) {
      // No migration path registered — safer to drop an unmigratable save
      // than hand a game a state shape it doesn't understand.
      return null;
    }
    current = step(current);
  }
  return current;
}

// Per-slug cache + listener sets, so saveGame("snake", ...) only notifies
// Snake's own subscribers, never other games'. The cached envelope is only
// ever replaced (not mutated), giving useSyncExternalStore-style consumers a
// stable reference between renders when nothing changed.
const saveCache = new Map<string, SaveEnvelope | null>();
const saveListeners = new Map<string, Set<() => void>>();

function getCachedEnvelope(slug: string): SaveEnvelope | null {
  if (!saveCache.has(slug)) {
    saveCache.set(slug, readEnvelope(slug));
  }
  return saveCache.get(slug) ?? null;
}

function notifySlug(slug: string): void {
  const listeners = saveListeners.get(slug);
  if (!listeners) {
    return;
  }
  for (const listener of listeners) {
    listener();
  }
}

const savedThisVisit = new Set<string>();

export function saveGame<T>(slug: string, state: T): void {
  const envelope: SaveEnvelope<T> = {
    version: SAVE_VERSION,
    updatedAt: new Date().toISOString(),
    deviceId: getDeviceId(),
    state,
  };
  saveCache.set(slug, envelope);
  writeEnvelope(slug, envelope);
  notifySlug(slug);
  if (!savedThisVisit.has(slug)) {
    savedThisVisit.add(slug);
    emitPlatformAnalyticsEvent({ type: "save-created", gameSlug: slug });
  }
}

export function loadGame<T>(slug: string): T | null {
  const envelope = getCachedEnvelope(slug);
  if (!envelope) {
    return null;
  }
  const migrated = migrate(envelope);
  if (!migrated) {
    clearSave(slug);
    return null;
  }
  return migrated.state as T;
}

/** For the Save Indicator's "저장됨 · n초 전" display — null if no save exists. */
export function getSaveUpdatedAt(slug: string): string | null {
  const envelope = getCachedEnvelope(slug);
  return envelope ? envelope.updatedAt : null;
}

export function clearSave(slug: string): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(saveKey(slug));
  }
  saveCache.set(slug, null);
  notifySlug(slug);
}

export function hasSave(slug: string): boolean {
  return loadGame(slug) !== null;
}

export function getServerHasSaveSnapshot(): boolean {
  return false;
}

export function subscribeSave(slug: string, listener: () => void): () => void {
  let listeners = saveListeners.get(slug);
  if (!listeners) {
    listeners = new Set();
    saveListeners.set(slug, listeners);
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}
