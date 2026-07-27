/**
 * Sprint 13.6 — Game Standard for all single-player games.
 *
 * Every 1P game implements this lifecycle via `createGameSession`:
 *
 *   Game → Start · Pause · Resume · Retry · Exit
 *        → Save · Stage · Difficulty · Result · Progress
 */

/** Terminal / milestone outcomes — maps to overlay + progress. */
export type GameOutcome = "victory" | "failure" | "clear" | "exit";

/** In-game phase (UI + input gating). */
export type GameStandardPhase =
  | "idle"
  | "playing"
  | "paused"
  | "stage-clear"
  | "game-over"
  | "victory";

/** Which standard features this game supports. */
export interface GameStandardCapabilities {
  /** Pause / Resume (single-player only). */
  pause: boolean;
  /** Multi-stage runs with next-stage flow. */
  stage: boolean;
  /** Difficulty tiers (Easy/Normal/Hard or per-stage scaling). */
  difficulty: boolean;
  /** Mid-run save via useAutoSave. */
  save: boolean;
}

/** Rule taxonomy — document in docs/game-rules/*.md */
export interface GameRuleTaxonomy {
  /** How difficulty scales (speed, grid, colors, etc.). */
  difficulty: string;
  /** Stage structure (score ladder, grid size, merge target, …). */
  stage: string;
  /** When the run ends in failure (lives, timeout, board full, …). */
  gameOver: string;
  /** Stage / level clear condition. */
  clear: string;
  /** Run victory (boss, final stage, 2048 tile, …). */
  victory: string;
  /** Non-terminal failure (wrong tap, mine hit, …). */
  failure: string;
}

export interface GameStandardDefinition {
  slug: string;
  title: string;
  capabilities: GameStandardCapabilities;
  rules: GameRuleTaxonomy;
  /** QA batch for Sprint 13.6 rollout. */
  batch?: 1 | 2 | 3;
}

/** Batch 1 — first stabilization wave. */
export const BATCH_1_SLUGS = ["bubble-pop", "2048", "memory", "color-match"] as const;

/** Batch 2 */
export const BATCH_2_SLUGS = ["tetris", "air-hockey", "sudoku", "minesweeper"] as const;

const DEFAULT_CAPABILITIES: GameStandardCapabilities = {
  pause: true,
  stage: true,
  difficulty: true,
  save: true,
};

/** Registry — extend as games are documented. */
export const GAME_STANDARD_REGISTRY: Record<string, GameStandardDefinition> = {
  "bubble-pop": {
    slug: "bubble-pop",
    title: "Bubble Pop",
    batch: 1,
    capabilities: { ...DEFAULT_CAPABILITIES, stage: false },
    rules: {
      difficulty: "Ceiling drop every 8 shots; 5 colors",
      stage: "Score ladder 300→6000 (journey UI)",
      gameOver: "Bottom row occupied or ceiling overflow",
      clear: "N/A — board clear = victory",
      victory: "Empty grid",
      failure: "Bubble reaches bottom line",
    },
  },
  "2048": {
    slug: "2048",
    title: "2048",
    batch: 1,
    capabilities: { ...DEFAULT_CAPABILITIES, stage: true },
    rules: {
      difficulty: "Spawn 2/4; no time limit",
      stage: "Tile ladder 256→4096",
      gameOver: "No valid moves",
      clear: "Reach stage target tile",
      victory: "Tile ≥ 2048",
      failure: "Board locked",
    },
  },
  memory: {
    slug: "memory",
    title: "Memory",
    batch: 1,
    capabilities: { ...DEFAULT_CAPABILITIES },
    rules: {
      difficulty: "Grid size + pair count per stage",
      stage: "2×2 → 6×6 grid ladder",
      gameOver: "Move limit exceeded (planned)",
      clear: "All pairs matched",
      victory: "All pairs matched",
      failure: "Wrong pairs / timeout (planned)",
    },
  },
  "color-match": {
    slug: "color-match",
    title: "Color Match",
    batch: 1,
    capabilities: { ...DEFAULT_CAPABILITIES, stage: false },
    rules: {
      difficulty: "Round duration shrinks; options increase R5+",
      stage: "Score survival ladder",
      gameOver: "Lives = 0 or round timeout",
      clear: "N/A — endless",
      victory: "N/A",
      failure: "Wrong color tap",
    },
  },
  tetris: {
    slug: "tetris",
    title: "Tetris",
    batch: 2,
    capabilities: DEFAULT_CAPABILITIES,
    rules: {
      difficulty: "Drop speed by level (lines/10)",
      stage: "Score ladder 500→10000",
      gameOver: "Spawn blocked",
      clear: "Line clears",
      victory: "N/A — survival",
      failure: "Stack reaches spawn",
    },
  },
  "air-hockey": {
    slug: "air-hockey",
    title: "Air Hockey",
    batch: 2,
    capabilities: { ...DEFAULT_CAPABILITIES, pause: false },
    rules: {
      difficulty: "AI speed; 5 goals to win",
      stage: "Score ladder",
      gameOver: "5 goals or 180s timeout",
      clear: "N/A",
      victory: "5 goals before AI",
      failure: "AI reaches 5 goals",
    },
  },
  sudoku: {
    slug: "sudoku",
    title: "Sudoku",
    batch: 2,
    capabilities: DEFAULT_CAPABILITIES,
    rules: {
      difficulty: "Easy/Normal/Hard givens",
      stage: "Easy→Master ladder",
      gameOver: "3 mistakes",
      clear: "Board complete",
      victory: "Valid solution",
      failure: "Third mistake",
    },
  },
  minesweeper: {
    slug: "minesweeper",
    title: "Minesweeper",
    batch: 2,
    capabilities: DEFAULT_CAPABILITIES,
    rules: {
      difficulty: "Grid size + mine count",
      stage: "Round 1–5 ladder",
      gameOver: "Mine clicked",
      clear: "All safe cells revealed",
      victory: "Board cleared",
      failure: "Mine detonation",
    },
  },
  snake: {
    slug: "snake",
    title: "Snake.io",
    capabilities: { pause: false, stage: true, difficulty: true, save: true },
    rules: {
      difficulty: "Speed + AI count per stage",
      stage: "Stage 1–5 ladder (STAGE mode)",
      gameOver: "Death / collision",
      clear: "Stage score target",
      victory: "All stages clear",
      failure: "Death",
    },
  },
};

export function getGameStandard(slug: string): GameStandardDefinition | null {
  return GAME_STANDARD_REGISTRY[slug] ?? null;
}

export function getBatchSlugs(batch: 1 | 2 | 3): string[] {
  if (batch === 1) return [...BATCH_1_SLUGS];
  if (batch === 2) return [...BATCH_2_SLUGS];
  return [];
}
