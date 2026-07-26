/** Golden Path crash records — localStorage (`play29:entry-crash-log`). */

export interface EntryCrashRecord {
  version: string;
  commit: string;
  browser: string;
  step: string;
  error: string;
  room?: string;
  url: string;
  timestamp: string;
}

const STORAGE_KEY = "play29:entry-crash-log";
const MAX = 30;

function buildCommit(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA) {
    return process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 7);
  }
  return "local";
}

export function recordEntryCrash(
  step: string,
  error: string,
  ctx?: { room?: string; commit?: string; version?: string }
): EntryCrashRecord {
  const commit = ctx?.commit ?? buildCommit();
  const record: EntryCrashRecord = {
    version: ctx?.version ?? commit,
    commit,
    browser: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    step,
    error,
    room: ctx?.room,
    url: typeof window !== "undefined" ? window.location.href : "",
    timestamp: new Date().toISOString(),
  };
  if (typeof window === "undefined") return record;
  try {
    const prev = loadEntryCrashLog();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([record, ...prev].slice(0, MAX)));
  } catch {
    /* ignore quota */
  }
  return record;
}

export function loadEntryCrashLog(): EntryCrashRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as EntryCrashRecord[]) : [];
  } catch {
    return [];
  }
}

export function exportEntryCrashLogText(): string {
  return JSON.stringify(loadEntryCrashLog(), null, 2);
}

/** Alias for PM QA workflow. */
export function copyEntryCrashLogText(): string {
  return exportEntryCrashLogText();
}

export function clearEntryCrashLog(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export const EntryCrashLog = {
  record: recordEntryCrash,
  load: loadEntryCrashLog,
  export: exportEntryCrashLogText,
  copy: copyEntryCrashLogText,
  clear: clearEntryCrashLog,
};
