// Slugs that have real, playable game code registered in games/*. Kept in a
// plain (non-"use client") module so Server Components can check "is this
// slug playable?" without pulling in next/dynamic's client-only loader
// (see components/game-player.tsx).
export const PLAYABLE_SLUGS = [
  "2048",
  "snake",
  "breakout",
  "arkanoid-dx",
  "memory",
  "minesweeper",
  "samegame",
  "maze-runner",
  "tank-battle",
  "galaxy-defender",
  "space-defender",
  "bubble-pop",
  "sudoku",
  "tic-tac-toe",
  "simon",
  "hangman",
  "color-match",
  "air-hockey",
  "tetris",
  "gold-miner",
  "space-impact",
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
  "chess",
  "checkers",
  "jigsaw",
  "mancala",
  "mini-golf",
  "billiards",
  "basketball",
  "table-tennis",
  "domino",
  "crossword",
  "chess960",
  "shuffleboard",
  "kakuro",
  "nonogram",
  "word-search",
] as const;

export type PlayableSlug = (typeof PLAYABLE_SLUGS)[number];

export function isPlayableSlug(slug: string): slug is PlayableSlug {
  return (PLAYABLE_SLUGS as readonly string[]).includes(slug);
}
