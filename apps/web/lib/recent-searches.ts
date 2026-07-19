// Same useSyncExternalStore pattern as favorites/recently-played in
// local-storage.ts. Kept as a separate module since it's a distinct concern
// (search history, not game bookmarks), but the underlying storage
// mechanics are identical.
const RECENT_SEARCHES_KEY = "play29:recent-searches";
const RECENT_SEARCHES_LIMIT = 8;

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

let recentSearchesCache = readList(RECENT_SEARCHES_KEY);
const recentSearchesListeners = new Set<Listener>();

function notify(): void {
  for (const listener of recentSearchesListeners) {
    listener();
  }
}

export function getRecentSearchesSnapshot(): string[] {
  return recentSearchesCache;
}

// useSyncExternalStore requires a referentially stable snapshot.
const EMPTY_LIST: string[] = [];

export function getServerRecentSearchesSnapshot(): string[] {
  return EMPTY_LIST;
}

export function subscribeRecentSearches(listener: Listener): () => void {
  recentSearchesListeners.add(listener);
  return () => recentSearchesListeners.delete(listener);
}

// Only call this when a search is actually submitted (form submit, Enter
// key, or clicking a suggestion) — not on every keystroke.
export function recordSearch(query: string): void {
  const trimmed = query.trim();
  if (!trimmed) {
    return;
  }
  recentSearchesCache = [
    trimmed,
    ...recentSearchesCache.filter(
      (s) => s.toLowerCase() !== trimmed.toLowerCase()
    ),
  ].slice(0, RECENT_SEARCHES_LIMIT);
  writeList(RECENT_SEARCHES_KEY, recentSearchesCache);
  notify();
}

export function clearRecentSearches(): void {
  recentSearchesCache = [];
  writeList(RECENT_SEARCHES_KEY, recentSearchesCache);
  notify();
}
