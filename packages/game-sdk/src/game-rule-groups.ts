/**
 * Sprint 14 — Rule groups. Framework handles lifecycle; games override rules only.
 */
import type { GameRuleTaxonomy, GameStandardCapabilities } from "./game-standard";

export type GameRuleGroup = "puzzle" | "shooter" | "arcade" | "reaction" | "board" | "sports";

export interface GameRuleGroupDef {
  id: GameRuleGroup;
  label: string;
  slugs: readonly string[];
  defaultCapabilities: GameStandardCapabilities;
  defaultRules: GameRuleTaxonomy;
}

const DEFAULT_CAPS: GameStandardCapabilities = {
  pause: true,
  stage: true,
  difficulty: true,
  save: true,
};

export const GAME_RULE_GROUPS: GameRuleGroupDef[] = [
  {
    id: "puzzle",
    label: "Puzzle",
    slugs: [
      "2048",
      "memory",
      "sudoku",
      "minesweeper",
      "color-match",
      "samegame",
      "sliding-puzzle",
      "nonogram",
      "kakuro",
      "crossword",
      "word-search",
      "jigsaw",
      "ball-sort",
      "color-sort",
      "merge-blocks",
    ],
    defaultCapabilities: DEFAULT_CAPS,
    defaultRules: {
      difficulty: "Grid / timer / mistake limits scale per stage",
      stage: "Score or grid ladder",
      gameOver: "No valid moves or limit exceeded",
      clear: "Puzzle solved or target reached",
      victory: "Final stage or max score",
      failure: "Wrong move or timeout",
    },
  },
  {
    id: "shooter",
    label: "Shooter",
    slugs: [
      "bubble-pop",
      "bubble-shooter",
      "galaxy-defender",
      "space-defender",
      "space-impact",
      "tank-battle",
      "gold-miner",
      "breakout",
      "arkanoid-dx",
    ],
    defaultCapabilities: { ...DEFAULT_CAPS, stage: false },
    defaultRules: {
      difficulty: "Spawn rate / speed / colors per stage",
      stage: "Score survival ladder",
      gameOver: "Lives depleted or ceiling/bottom reached",
      clear: "Board clear or wave complete",
      victory: "All stages cleared",
      failure: "Projectile / enemy contact",
    },
  },
  {
    id: "arcade",
    label: "Arcade",
    slugs: [
      "tetris",
      "air-hockey",
      "stack-tower",
      "whack-a-mole",
      "simon",
      "maze-runner",
      "snake",
    ],
    defaultCapabilities: DEFAULT_CAPS,
    defaultRules: {
      difficulty: "Speed / AI / spawn density",
      stage: "Score ladder",
      gameOver: "Stack full / time out / death",
      clear: "Line clear / wave / stage target",
      victory: "Final stage score",
      failure: "Collision / miss",
    },
  },
  {
    id: "reaction",
    label: "Reaction",
    slugs: [
      "penalty-shootout",
      "darts",
      "archery",
      "bowling",
      "basketball",
      "mini-golf",
    ],
    defaultCapabilities: { ...DEFAULT_CAPS, stage: false },
    defaultRules: {
      difficulty: "Target size / time window shrinks",
      stage: "Round ladder",
      gameOver: "Attempts exhausted",
      clear: "Target hit",
      victory: "Perfect round streak",
      failure: "Miss / wrong timing",
    },
  },
  {
    id: "board",
    label: "Board",
    slugs: [
      "chess",
      "checkers",
      "connect4",
      "reversi",
      "gomoku",
      "mancala",
      "domino",
      "chess960",
      "tic-tac-toe",
      "hangman",
    ],
    defaultCapabilities: { ...DEFAULT_CAPS, pause: true },
    defaultRules: {
      difficulty: "AI depth / board size",
      stage: "Match ladder",
      gameOver: "Checkmate / connect / stalemate",
      clear: "Round won",
      victory: "Series won",
      failure: "Round lost",
    },
  },
  {
    id: "sports",
    label: "Sports",
    slugs: ["billiards", "table-tennis", "shuffleboard"],
    defaultCapabilities: { ...DEFAULT_CAPS, pause: false },
    defaultRules: {
      difficulty: "AI accuracy / physics",
      stage: "Score to win",
      gameOver: "Match point reached",
      clear: "N/A",
      victory: "Score target first",
      failure: "Opponent scores first",
    },
  },
];

const SLUG_TO_GROUP = new Map<string, GameRuleGroupDef>();
for (const group of GAME_RULE_GROUPS) {
  for (const slug of group.slugs) {
    SLUG_TO_GROUP.set(slug, group);
  }
}

export function getGameRuleGroup(slug: string): GameRuleGroupDef | null {
  return SLUG_TO_GROUP.get(slug) ?? null;
}

export function getGroupSlugs(groupId: GameRuleGroup): readonly string[] {
  return GAME_RULE_GROUPS.find((g) => g.id === groupId)?.slugs ?? [];
}

export function getAllGroupedSlugs(): string[] {
  return [...SLUG_TO_GROUP.keys()];
}
