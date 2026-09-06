/**
 * Feedback Intelligence — pattern detection & dashboard aggregation (no AI).
 */
import {
  emptyTypeCounts,
  FEEDBACK_TYPE_LABELS,
  P0_FEEDBACK_GAMES,
  type FeedbackStatus,
  type FeedbackType,
} from "@/lib/game-feedback-types";
import type { GameComment } from "@/lib/supabase/game-comments";

export const WORK_ORDER_PRIORITIES = ["P0", "P1", "P2", "P3"] as const;
export type WorkOrderPriority = (typeof WORK_ORDER_PRIORITIES)[number];

export const REPEAT_TYPES: FeedbackType[] = ["bug", "mobile", "fun", "idea"];
export const MIN_REPEAT_COUNT = 2;

export type RepeatPattern = {
  gameSlug: string;
  feedbackType: FeedbackType;
  sampleContent: string;
  normalizedKey: string;
  count: number;
  feedbackIds: string[];
  latestAt: string;
  /** Suggested priority for CPO — never auto P0 */
  suggestedPriority: WorkOrderPriority;
};

export type GameDashboardRow = {
  gameSlug: string;
  label: string;
  total: number;
  newCount: number;
  bug: number;
  mobile: number;
  fun: number;
  idea: number;
  opinion: number;
};

export type DailyOpsRow = {
  date: string;
  displayDate: string;
  bug: number;
  mobile: number;
  fun: number;
  idea: number;
  opinion: number;
  total: number;
};

export type FeedbackDashboardData = {
  total: number;
  todayNew: number;
  newStatusCount: number;
  games: GameDashboardRow[];
  dailyLast7: DailyOpsRow[];
  patterns: RepeatPattern[];
};

function utcDateKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function formatDisplayDate(dateKey: string): string {
  const [, month, day] = dateKey.split("-");
  return `${month}/${day}`;
}

/** Normalize for grouping — not AI clustering; exact normalized match only */
export function normalizeContentKey(content: string): string {
  return content
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s가-힣]/g, "")
    .slice(0, 120);
}

/** Rule-based priority hint — CPO decides final; never auto P0 */
export function suggestPriority(
  feedbackType: FeedbackType,
  count: number
): WorkOrderPriority {
  if (feedbackType === "mobile") return "P1";
  if (feedbackType === "bug") return count >= 3 ? "P1" : "P2";
  if (feedbackType === "fun") return "P2";
  return "P2";
}

export function detectRepeatPatterns(
  rows: GameComment[],
  minCount = MIN_REPEAT_COUNT
): RepeatPattern[] {
  const groups = new Map<
    string,
    {
      gameSlug: string;
      feedbackType: FeedbackType;
      sampleContent: string;
      normalizedKey: string;
      feedbackIds: string[];
      latestAt: string;
    }
  >();

  for (const row of rows) {
    if (!REPEAT_TYPES.includes(row.feedbackType)) continue;
    if (!(P0_FEEDBACK_GAMES as readonly string[]).includes(row.gameSlug)) continue;

    const normalizedKey = normalizeContentKey(row.content);
    if (normalizedKey.length < 4) continue;

    const key = `${row.gameSlug}:${row.feedbackType}:${normalizedKey}`;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        gameSlug: row.gameSlug,
        feedbackType: row.feedbackType,
        sampleContent: row.content.trim(),
        normalizedKey,
        feedbackIds: [row.id],
        latestAt: row.createdAt,
      });
      continue;
    }
    existing.feedbackIds.push(row.id);
    if (row.createdAt > existing.latestAt) existing.latestAt = row.createdAt;
  }

  return [...groups.values()]
    .filter((g) => g.feedbackIds.length >= minCount)
    .map((g) => ({
      ...g,
      count: g.feedbackIds.length,
      suggestedPriority: suggestPriority(g.feedbackType, g.feedbackIds.length),
    }))
    .sort((a, b) => b.count - a.count || b.latestAt.localeCompare(a.latestAt));
}

export function buildDailyLast7(rows: GameComment[], days = 7): DailyOpsRow[] {
  const today = new Date();
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    keys.push(d.toISOString().slice(0, 10));
  }

  const byDay = new Map<string, ReturnType<typeof emptyTypeCounts>>();
  for (const key of keys) byDay.set(key, emptyTypeCounts());

  for (const row of rows) {
    const key = utcDateKey(row.createdAt);
    const bucket = byDay.get(key);
    if (!bucket) continue;
    bucket[row.feedbackType] += 1;
  }

  return keys.map((date) => {
    const types = byDay.get(date) ?? emptyTypeCounts();
    const total =
      types.bug + types.mobile + types.fun + types.idea + types.opinion;
    return {
      date,
      displayDate: formatDisplayDate(date),
      bug: types.bug,
      mobile: types.mobile,
      fun: types.fun,
      idea: types.idea,
      opinion: types.opinion,
      total,
    };
  });
}

export function buildFeedbackDashboard(rows: GameComment[]): FeedbackDashboardData {
  const today = new Date().toISOString().slice(0, 10);
  let todayNew = 0;
  let newStatusCount = 0;

  const games: GameDashboardRow[] = P0_FEEDBACK_GAMES.map((gameSlug) => {
    const gameRows = rows.filter((r) => r.gameSlug === gameSlug);
    const byType = emptyTypeCounts();
    let newCount = 0;
    for (const r of gameRows) {
      byType[r.feedbackType] += 1;
      if (r.status === "NEW") newCount += 1;
    }
    return {
      gameSlug,
      label: gameSlug,
      total: gameRows.length,
      newCount,
      bug: byType.bug,
      mobile: byType.mobile,
      fun: byType.fun,
      idea: byType.idea,
      opinion: byType.opinion,
    };
  });

  for (const row of rows) {
    if (row.status === "NEW") newStatusCount += 1;
    if (utcDateKey(row.createdAt) === today) todayNew += 1;
  }

  return {
    total: rows.length,
    todayNew,
    newStatusCount,
    games,
    dailyLast7: buildDailyLast7(rows),
    patterns: detectRepeatPatterns(rows),
  };
}

export function isFeedbackStatus(value: string): value is FeedbackStatus {
  return [
    "NEW",
    "REVIEWING",
    "PLANNED",
    "IN_PROGRESS",
    "QA",
    "RELEASED",
  ].includes(value);
}

export function isWorkOrderPriority(value: string): value is WorkOrderPriority {
  return (WORK_ORDER_PRIORITIES as readonly string[]).includes(value);
}

export function formatGameLabel(slug: string): string {
  if (slug === "re-front") return "Re:Front";
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

export { FEEDBACK_TYPE_LABELS };
