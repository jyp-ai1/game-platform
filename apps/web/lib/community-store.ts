/**
 * Community data — Sprint18 full local MVP with replies, sort, report.
 */
import { getPlayHistorySnapshot } from "@/lib/play-history";

const COMMENTS_KEY = "play29:community-comments";
const LIKES_KEY = "play29:comment-likes";
const RATINGS_KEY = "play29:game-ratings";
const BUG_KEY = "play29:bug-reports";
const REPORTS_KEY = "play29:comment-reports";

export type CommentSort = "recent" | "popular";

export interface CommunityComment {
  id: string;
  gameSlug: string;
  message: string;
  author: string;
  createdAt: string;
  likes: number;
  parentId?: string;
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

export function listComments(sort: CommentSort = "recent"): CommunityComment[] {
  const list = readJson<CommunityComment[]>(COMMENTS_KEY, []);
  if (sort === "popular") {
    return [...list].sort((a, b) => b.likes - a.likes || b.createdAt.localeCompare(a.createdAt));
  }
  return list;
}

export function listCommentsForGame(gameSlug: string, sort: CommentSort = "recent"): CommunityComment[] {
  return listComments(sort).filter((c) => c.gameSlug === gameSlug && !c.parentId);
}

export function listReplies(parentId: string): CommunityComment[] {
  return listComments().filter((c) => c.parentId === parentId);
}

export function postComment(
  gameSlug: string,
  message: string,
  opts?: { author?: string; parentId?: string }
): void {
  if (!message.trim()) return;
  const list = listComments();
  list.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    gameSlug,
    message: message.trim(),
    author: opts?.author ?? "Player",
    createdAt: new Date().toISOString(),
    likes: 0,
    parentId: opts?.parentId,
  });
  writeJson(COMMENTS_KEY, list.slice(0, 200));
}

export function toggleCommentLike(commentId: string): void {
  const likes = readJson<Record<string, boolean>>(LIKES_KEY, {});
  const list = listComments();
  const comment = list.find((c) => c.id === commentId);
  if (!comment) return;

  const wasLiked = likes[commentId] ?? false;
  likes[commentId] = !wasLiked;
  comment.likes = Math.max(0, comment.likes + (wasLiked ? -1 : 1));
  writeJson(LIKES_KEY, likes);
  writeJson(COMMENTS_KEY, list);
}

export function isCommentLiked(commentId: string): boolean {
  return readJson<Record<string, boolean>>(LIKES_KEY, {})[commentId] ?? false;
}

export function reportComment(commentId: string): void {
  const reports = readJson<string[]>(REPORTS_KEY, []);
  if (!reports.includes(commentId)) {
    reports.push(commentId);
    writeJson(REPORTS_KEY, reports.slice(0, 100));
  }
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

/** AI Summary input — cluster bugs/comments by game. */
export function getCommunityAiSummary(): { gameSlug: string; count: number; theme: string }[] {
  const bugs = listBugReports();
  const byGame = new Map<string, number>();
  for (const b of bugs) {
    byGame.set(b.gameSlug, (byGame.get(b.gameSlug) ?? 0) + 1);
  }
  const comments = listComments();
  for (const c of comments) {
    if (c.message.toLowerCase().includes("bug") || c.message.toLowerCase().includes("error")) {
      byGame.set(c.gameSlug, (byGame.get(c.gameSlug) ?? 0) + 1);
    }
  }

  return [...byGame.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([gameSlug, count]) => ({
      gameSlug,
      count,
      theme: count >= 3 ? "오류 집중" : count >= 2 ? "모바일/UX" : "피드백",
    }));
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
      label: `${c.author} · ${c.gameSlug}`,
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
