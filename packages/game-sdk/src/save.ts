// Shared save/resume system — every game reads/writes progress exclusively
// through this module (never touching localStorage directly). Each game
// owns its own serializable reducer state; this module owns persistence,
// versioning, and per-slug reactivity.
const SAVE_KEY_PREFIX = "play29:save:";

export const SAVE_VERSION = 1;

export interface SaveEnvelope<T = unknown> {
  version: number;
  updatedAt: string;
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

// Migrations keyed by "version to migrate FROM". Empty today — only v1
// exists — but this shape is load-bearing: a future version bump adds an
// entry here (e.g. `1: migrateV1ToV2`) without touching loadGame's call site.
const MIGRATIONS: Record<number, (envelope: SaveEnvelope) => SaveEnvelope> = {};

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

export function saveGame<T>(slug: string, state: T): void {
  const envelope: SaveEnvelope<T> = {
    version: SAVE_VERSION,
    updatedAt: new Date().toISOString(),
    state,
  };
  saveCache.set(slug, envelope);
  writeEnvelope(slug, envelope);
  notifySlug(slug);
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
