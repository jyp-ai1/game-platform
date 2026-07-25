/**
 * Seed mock community data when empty — real-service feel without backend.
 */
import {
  listComments,
  listBugReports,
  postComment,
  submitBugReport,
  type CommunityComment,
} from "@/lib/community-store";

const SEED_KEY = "play29:community-seeded";

const MOCK_COMMENTS: Omit<CommunityComment, "id" | "createdAt">[] = [
  { gameSlug: "2048", message: "Addictive." },
  { gameSlug: "snake", message: "Classic vibes." },
  { gameSlug: "tetris", message: "Best on mobile." },
  { gameSlug: "breakout", message: "Smooth controls." },
  { gameSlug: "memory", message: "Great warm-up." },
];

export function ensureCommunityMockData(): void {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(SEED_KEY)) return;
  if (listComments().length > 0) {
    window.localStorage.setItem(SEED_KEY, "1");
    return;
  }

  const base = Date.now();
  MOCK_COMMENTS.forEach((c, i) => {
    postComment(c.gameSlug, c.message);
  });

  if (listBugReports().length === 0) {
    submitBugReport("2048", "Tile merge animation stutter on Safari");
  }

  window.localStorage.setItem(SEED_KEY, "1");
  void base;
}
