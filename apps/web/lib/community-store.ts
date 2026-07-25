/**
 * Local community data (MVP) — Sprint17 server sync target.
 */
import { getPlayHistorySnapshot } from "@/lib/play-history";

const COMMENTS_KEY = "play29:community-comments";
const RATINGS_KEY = "play29:game-ratings";
const BUG_KEY = "play29:bug-reports";

export interface CommunityComment {
  id: string;
  gameSlug: string;
  message: string;
  createdAt: string;
}

export interface BugReport {
  id: string;
  gameSlug: string;
  message: string;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  label: string;
  createdAt: string;
}

type RatingMap = Record<string, number>;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function listComments(): CommunityComment[] {
  return readJson<CommunityComment[]>(COMMENTS_KEY, []);
}

export function postComment(gameSlug: string, message: string): void {
  if (!message.trim()) return;
  const list = listComments();
  list.unshift({
    id: `${Date.now()}`,
    gameSlug,
    message: message.trim(),
    createdAt: new Date().toISOString(),
  });
  writeJson(COMMENTS_KEY, list.slice(0, 100));
}

export function getRating(gameSlug: string): number {
  const map = readJson<RatingMap>(RATINGS_KEY, {});
  return map[gameSlug] ?? 0;
}

export function setRating(gameSlug: string, stars: number): void {
  const map = readJson<RatingMap>(RATINGS_KEY, {});
  map[gameSlug] = Math.min(5, Math.max(1, stars));
  writeJson(RATINGS_KEY, map);
}

export function listBugReports(): BugReport[] {
  return readJson<BugReport[]>(BUG_KEY, []);
}

export function submitBugReport(gameSlug: string, message: string): void {
  if (!message.trim()) return;
  const list = listBugReports();
  list.unshift({
    id: `${Date.now()}`,
    gameSlug,
    message: message.trim(),
    createdAt: new Date().toISOString(),
  });
  writeJson(BUG_KEY, list.slice(0, 50));
}

export function getRecentActivity(limit = 8): ActivityItem[] {
  const history = getPlayHistorySnapshot();
  const comments = listComments();
  const bugs = listBugReports();

  const items: ActivityItem[] = [
    ...history.slice(0, 20).map((e) => ({
      id: `play-${e.id}`,
      label: `Played ${e.slug}`,
      createdAt: e.startedAt,
    })),
    ...comments.slice(0, 10).map((c) => ({
      id: `comment-${c.id}`,
      label: `Comment on ${c.gameSlug}`,
      createdAt: c.createdAt,
    })),
    ...bugs.slice(0, 5).map((b) => ({
      id: `bug-${b.id}`,
      label: `Report · ${b.gameSlug}`,
      createdAt: b.createdAt,
    })),
  ];

  return items
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
