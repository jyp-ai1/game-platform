// "play29:" prefix kept unchanged post-rebrand — see the same note in
// packages/game-sdk/src/local-storage.ts (internal storage key, not brand
// text; renaming would orphan existing visitors' saved data).
const FAVORITES_KEY = "play29:favorites";
const RECENTLY_PLAYED_KEY = "play29:recently-played";
const RECENTLY_PLAYED_LIMIT = 10;
const LAST_PLAYED_AT_KEY = "play29:last-played-at";

type Listener = () => void;

function readList(key: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeList(key: string, list: string[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(list));
}

function readMap(key: string): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeMap(key: string, map: Record<string, string>): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(map));
}

// Cached module-level snapshots so useSyncExternalStore gets a stable
// reference between renders (it only changes when we explicitly notify).
let favoritesCache = readList(FAVORITES_KEY);
let recentlyPlayedCache = readList(RECENTLY_PLAYED_KEY);
let lastPlayedAtCache = readMap(LAST_PLAYED_AT_KEY);

const favoritesListeners = new Set<Listener>();
const recentlyPlayedListeners = new Set<Listener>();

function notify(listeners: Set<Listener>): void {
  for (const listener of listeners) {
    listener();
  }
}

export function getFavoritesSnapshot(): string[] {
  return favoritesCache;
}

// useSyncExternalStore requires a referentially stable snapshot, so this
// returns the same empty array every call rather than a fresh `[]` literal.
const EMPTY_LIST: string[] = [];

export function getServerFavoritesSnapshot(): string[] {
  return EMPTY_LIST;
}

export function subscribeFavorites(listener: Listener): () => void {
  favoritesListeners.add(listener);
  return () => favoritesListeners.delete(listener);
}

export function isFavorite(slug: string): boolean {
  return favoritesCache.includes(slug);
}

export function toggleFavorite(slug: string): void {
  favoritesCache = favoritesCache.includes(slug)
    ? favoritesCache.filter((s) => s !== slug)
    : [...favoritesCache, slug];
  writeList(FAVORITES_KEY, favoritesCache);
  notify(favoritesListeners);
}

export function getRecentlyPlayedSnapshot(): string[] {
  return recentlyPlayedCache;
}

export function getServerRecentlyPlayedSnapshot(): string[] {
  return EMPTY_LIST;
}

export function subscribeRecentlyPlayed(listener: Listener): () => void {
  recentlyPlayedListeners.add(listener);
  return () => recentlyPlayedListeners.delete(listener);
}

export function recordPlayed(slug: string): void {
  recentlyPlayedCache = [
    slug,
    ...recentlyPlayedCache.filter((s) => s !== slug),
  ].slice(0, RECENTLY_PLAYED_LIMIT);
  writeList(RECENTLY_PLAYED_KEY, recentlyPlayedCache);

  lastPlayedAtCache = { ...lastPlayedAtCache, [slug]: new Date().toISOString() };
  writeMap(LAST_PLAYED_AT_KEY, lastPlayedAtCache);

  notify(recentlyPlayedListeners);
}

export function getLastPlayedAt(slug: string): string | null {
  return lastPlayedAtCache[slug] ?? null;
}
