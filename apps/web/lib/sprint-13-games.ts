/** Sprint 13 Content Expansion — 14 games (Epic 1 + Epic 2). */
export const SPRINT_13_NEW_GAME_SLUGS = [
  "stack-tower",
  "ball-sort",
  "color-sort",
  "penalty-shootout",
  "darts",
  "bubble-shooter",
  "merge-blocks",
  "connect4",
  "reversi",
  "gomoku",
  "bowling",
  "archery",
  "sliding-puzzle",
  "whack-a-mole",
] as const;

export type Sprint13GameSlug = (typeof SPRINT_13_NEW_GAME_SLUGS)[number];

export function isSprint13Game(slug: string): slug is Sprint13GameSlug {
  return (SPRINT_13_NEW_GAME_SLUGS as readonly string[]).includes(slug);
}
