/**
 * Game Feedback & QA Operations — shared types for comment → feedback pipeline.
 */

export const FEEDBACK_TYPES = ["opinion", "bug", "idea", "fun", "mobile"] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export const FEEDBACK_STATUSES = [
  "NEW",
  "REVIEWING",
  "PLANNED",
  "IN_PROGRESS",
  "QA",
  "RELEASED",
] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

/** P0 product games for feedback aggregation (Territory War excluded). */
export const P0_FEEDBACK_GAMES = ["agar", "snake", "bomber", "re-front"] as const;

export const FEEDBACK_TYPE_LABELS: Record<
  FeedbackType,
  { emoji: string; label: string }
> = {
  opinion: { emoji: "💬", label: "의견" },
  bug: { emoji: "🐛", label: "버그" },
  idea: { emoji: "💡", label: "아이디어" },
  fun: { emoji: "🎮", label: "재미/게임성" },
  mobile: { emoji: "📱", label: "모바일 UX" },
};

export function isFeedbackType(value: string): value is FeedbackType {
  return (FEEDBACK_TYPES as readonly string[]).includes(value);
}

export function normalizeFeedbackType(value: unknown): FeedbackType {
  if (typeof value === "string" && isFeedbackType(value)) {
    return value;
  }
  return "opinion";
}

export function emptyTypeCounts(): Record<FeedbackType, number> {
  return { opinion: 0, bug: 0, idea: 0, fun: 0, mobile: 0 };
}
