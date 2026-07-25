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
  { gameSlug: "2048", message: "Addictive.", author: "Player1", likes: 3 },
  { gameSlug: "snake", message: "Classic vibes.", author: "RetroFan", likes: 5 },
  { gameSlug: "tetris", message: "Best on mobile.", author: "MobileGamer", likes: 2 },
  { gameSlug: "breakout", message: "Smooth controls.", author: "Arcade", likes: 1 },
  { gameSlug: "memory", message: "Great warm-up.", author: "PuzzlePro", likes: 4 },
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
