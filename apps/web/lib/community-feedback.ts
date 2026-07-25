/**
 * Local community feedback (MVP) — Sprint17 sync target.
 */
const BUG_KEY = "play29:bug-reports";

export interface BugReport {
  id: string;
  gameSlug: string;
  message: string;
  createdAt: string;
}

export function listBugReports(): BugReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BUG_KEY);
    return raw ? (JSON.parse(raw) as BugReport[]) : [];
  } catch {
    return [];
  }
}

export function submitBugReport(gameSlug: string, message: string): void {
  if (typeof window === "undefined" || !message.trim()) return;
  const list = listBugReports();
  list.unshift({
    id: `${Date.now()}`,
    gameSlug,
    message: message.trim(),
    createdAt: new Date().toISOString(),
  });
  window.localStorage.setItem(BUG_KEY, JSON.stringify(list.slice(0, 50)));
}
