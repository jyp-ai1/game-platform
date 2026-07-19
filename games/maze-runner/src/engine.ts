export const COLS = 19;
export const ROWS = 21;

export type Cell = "wall" | "dot" | "power" | "empty";
export type Direction = "up" | "down" | "left" | "right" | "none";
export type ChaserMode = "scatter" | "chase" | "frightened";

export interface Position {
  x: number;
  y: number;
}

export interface Chaser {
  id: number;
  x: number;
  y: number;
  direction: Direction;
  mode: ChaserMode;
  homeX: number;
  homeY: number;
}

export type Status = "playing" | "won" | "over";

export interface MazeState {
  grid: Cell[][];
  playerX: number;
  playerY: number;
  playerDirection: Direction;
  queuedDirection: Direction;
  chasers: Chaser[];
  frightenedTimer: number;
  modeTimer: number;
  score: number;
  dotsRemaining: number;
  lives: number;
  status: Status;
}

const DELTAS: Record<Exclude<Direction, "none">, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
  none: "none",
};

export const STARTING_LIVES = 3;
export const FRIGHTENED_DURATION = 8;
export const SCATTER_DURATION = 7;
export const CHASE_DURATION = 20;
export const POINTS_PER_DOT = 10;
export const POINTS_PER_POWER = 50;
export const POINTS_PER_CHASER = 200;
export const CHASER_COUNT = 3;

const PLAYER_SPAWN: Position = { x: 9, y: 15 };
const PEN_SPAWNS: Position[] = [
  { x: 8, y: 9 },
  { x: 9, y: 9 },
  { x: 10, y: 9 },
];
const HOME_CORNERS: Position[] = [
  { x: 1, y: 1 },
  { x: COLS - 2, y: 1 },
  { x: 1, y: ROWS - 2 },
];

// Original 19x21 maze layout (not derived from any copyrighted source).
// '#' = wall, '.' = open floor (dot/power placed at runtime), 'o' = power spot,
// ' ' inside the border is treated the same as '.' (open floor).
// Symmetric left-right, hand designed.
const LAYOUT: string[] = [
  "###################",
  "#o.......#.......o#",
  "#.##.###.#.###.##.#",
  "#.................#",
  "#.##.#.#####.#.##.#",
  "#....#...#...#....#",
  "####.###.#.###.####",
  "####.#.......#.####",
  "####.#.##-##.#.####",
  "    ...........    ",
  "####.#.##-##.#.####",
  "####.#.......#.####",
  "####.###.#.###.####",
  "#........#........#",
  "#.##.###.#.###.##.#",
  "#..#..... .....#..#",
  "##.#.#.#####.#.#.##",
  "#....#...#...#....#",
  "#.######.#.######.#",
  "o.................o",
  "###################",
];

function normalizeLayoutRow(row: string): string {
  // Pad short rows (the pen-corridor rows) out to COLS with spaces (open floor).
  if (row.length < COLS) {
    return row + " ".repeat(COLS - row.length);
  }
  return row.slice(0, COLS);
}

function buildGrid(): Cell[][] {
  const grid: Cell[][] = [];
  for (let y = 0; y < ROWS; y++) {
    const rawRow = normalizeLayoutRow(LAYOUT[y] ?? "#".repeat(COLS));
    const row: Cell[] = [];
    for (let x = 0; x < COLS; x++) {
      const ch = rawRow[x];
      if (ch === "#") {
        row.push("wall");
      } else if (ch === "-") {
        // Pen gate: solid for movement purposes at spawn time, but we treat
        // it as empty (no dot) so it doesn't inflate dotsRemaining or block
        // chasers as they leave the pen.
        row.push("empty");
      } else if (ch === "o") {
        row.push("power");
      } else {
        row.push("dot");
      }
    }
    grid.push(row);
  }

  // Player and chaser spawn cells should never hold a dot.
  grid[PLAYER_SPAWN.y]![PLAYER_SPAWN.x] = "empty";
  for (const spawn of PEN_SPAWNS) {
    grid[spawn.y]![spawn.x] = "empty";
  }

  return grid;
}

function countDots(grid: Cell[][]): number {
  let count = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell === "dot" || cell === "power") {
        count++;
      }
    }
  }
  return count;
}

function cloneGrid(grid: Cell[][]): Cell[][] {
  return grid.map((row) => row.slice());
}

function cellAt(grid: Cell[][], x: number, y: number): Cell {
  const row = grid[wrapY(y)];
  if (!row) {
    return "wall";
  }
  return row[wrapX(x)] ?? "wall";
}

function wrapX(x: number): number {
  return ((x % COLS) + COLS) % COLS;
}

function wrapY(y: number): number {
  return ((y % ROWS) + ROWS) % ROWS;
}

function isWalkable(grid: Cell[][], x: number, y: number): boolean {
  return cellAt(grid, x, y) !== "wall";
}

export function createInitialState(): MazeState {
  const grid = buildGrid();
  const chasers: Chaser[] = PEN_SPAWNS.map((spawn, index) => {
    const home = HOME_CORNERS[index] ?? { x: 1, y: 1 };
    return {
      id: index,
      x: spawn.x,
      y: spawn.y,
      direction: "none",
      mode: "scatter",
      homeX: home.x,
      homeY: home.y,
    };
  });

  return {
    grid,
    playerX: PLAYER_SPAWN.x,
    playerY: PLAYER_SPAWN.y,
    playerDirection: "none",
    queuedDirection: "none",
    chasers,
    frightenedTimer: 0,
    modeTimer: SCATTER_DURATION,
    score: 0,
    dotsRemaining: countDots(grid),
    lives: STARTING_LIVES,
    status: "playing",
  };
}

export function setQueuedDirection(state: MazeState, dir: Direction): MazeState {
  if (state.status !== "playing") {
    return state;
  }
  return { ...state, queuedDirection: dir };
}

function manhattan(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

function chooseChaserDirection(
  grid: Cell[][],
  chaser: Chaser,
  targetX: number,
  targetY: number,
  maximize: boolean
): Direction {
  const candidates: Exclude<Direction, "none">[] = ["up", "down", "left", "right"];
  const reverse = OPPOSITE[chaser.direction];

  let best: Direction = chaser.direction;
  let bestScore = maximize ? -Infinity : Infinity;
  let found = false;

  for (const dir of candidates) {
    if (dir === reverse && chaser.direction !== "none") {
      continue;
    }
    const delta = DELTAS[dir];
    const nx = chaser.x + delta.x;
    const ny = chaser.y + delta.y;
    if (!isWalkable(grid, nx, ny)) {
      continue;
    }
    const dist = manhattan(nx, ny, targetX, targetY);
    const better = maximize ? dist > bestScore : dist < bestScore;
    if (!found || better) {
      bestScore = dist;
      best = dir;
      found = true;
    }
  }

  if (!found) {
    // No legal non-reversing move (dead end); allow reversing.
    for (const dir of candidates) {
      const delta = DELTAS[dir];
      const nx = chaser.x + delta.x;
      const ny = chaser.y + delta.y;
      if (isWalkable(grid, nx, ny)) {
        return dir;
      }
    }
    return chaser.direction;
  }

  return best;
}

function moveTowards(
  grid: Cell[][],
  x: number,
  y: number,
  direction: Direction
): Position {
  if (direction === "none") {
    return { x, y };
  }
  const delta = DELTAS[direction];
  const nx = x + delta.x;
  const ny = y + delta.y;
  if (!isWalkable(grid, nx, ny)) {
    return { x, y };
  }
  return { x: wrapX(nx), y: wrapY(ny) };
}

function respawnPositions(state: MazeState): MazeState {
  const chasers: Chaser[] = PEN_SPAWNS.map((spawn, index) => {
    const home = HOME_CORNERS[index] ?? { x: 1, y: 1 };
    return {
      id: index,
      x: spawn.x,
      y: spawn.y,
      direction: "none" as Direction,
      mode: "scatter" as ChaserMode,
      homeX: home.x,
      homeY: home.y,
    };
  });
  return {
    ...state,
    playerX: PLAYER_SPAWN.x,
    playerY: PLAYER_SPAWN.y,
    playerDirection: "none",
    queuedDirection: "none",
    chasers,
    frightenedTimer: 0,
    modeTimer: SCATTER_DURATION,
  };
}

export function step(state: MazeState, dtSeconds: number): MazeState {
  if (state.status !== "playing") {
    return state;
  }

  let grid = state.grid;
  let score = state.score;
  let dotsRemaining = state.dotsRemaining;
  let lives = state.lives;
  let status: Status = state.status;

  // (2) Apply queued direction if legal.
  let playerDirection = state.playerDirection;
  if (state.queuedDirection !== "none") {
    const delta = DELTAS[state.queuedDirection as Exclude<Direction, "none">];
    if (isWalkable(grid, state.playerX + delta.x, state.playerY + delta.y)) {
      playerDirection = state.queuedDirection;
    }
  }

  // (3) Advance player one grid step (tick-based movement, like Snake).
  const moved = moveTowards(grid, state.playerX, state.playerY, playerDirection);
  let playerX = moved.x;
  let playerY = moved.y;

  const occupied = cellAt(grid, playerX, playerY);
  let frightenedTimer = state.frightenedTimer;
  let chasers = state.chasers;

  if (occupied === "dot") {
    grid = cloneGrid(grid);
    grid[playerY]![playerX] = "empty";
    score += POINTS_PER_DOT;
    dotsRemaining -= 1;
  } else if (occupied === "power") {
    grid = cloneGrid(grid);
    grid[playerY]![playerX] = "empty";
    score += POINTS_PER_POWER;
    dotsRemaining -= 1;
    frightenedTimer = FRIGHTENED_DURATION;
    chasers = chasers.map((c) => ({ ...c, mode: "frightened" as ChaserMode }));
  }

  // (4) Frightened timer countdown.
  let modeTimer = state.modeTimer;
  const wasFrightened = frightenedTimer > 0;
  if (frightenedTimer > 0) {
    frightenedTimer = Math.max(0, frightenedTimer - dtSeconds);
    if (frightenedTimer === 0) {
      chasers = chasers.map((c) =>
        c.mode === "frightened" ? { ...c, mode: "chase" as ChaserMode } : c
      );
    }
  }

  // (5) Scatter/chase alternation (only when not frightened).
  if (!wasFrightened || frightenedTimer === 0) {
    if (frightenedTimer === 0) {
      modeTimer -= dtSeconds;
      if (modeTimer <= 0) {
        const currentlyScatter = chasers.some((c) => c.mode === "scatter");
        const nextMode: ChaserMode = currentlyScatter ? "chase" : "scatter";
        modeTimer = currentlyScatter ? CHASE_DURATION : SCATTER_DURATION;
        chasers = chasers.map((c) =>
          c.mode === "frightened" ? c : { ...c, mode: nextMode }
        );
      }
    }
  }

  // (6) Move each chaser via greedy single-step choice.
  chasers = chasers.map((chaser) => {
    let targetX: number;
    let targetY: number;
    let maximize = false;
    if (chaser.mode === "chase") {
      targetX = playerX;
      targetY = playerY;
    } else if (chaser.mode === "frightened") {
      targetX = playerX;
      targetY = playerY;
      maximize = true;
    } else {
      targetX = chaser.homeX;
      targetY = chaser.homeY;
    }

    const direction = chooseChaserDirection(grid, chaser, targetX, targetY, maximize);
    const nextPos = moveTowards(grid, chaser.x, chaser.y, direction);
    return { ...chaser, x: nextPos.x, y: nextPos.y, direction };
  });

  // (7) Collision check.
  for (let i = 0; i < chasers.length; i++) {
    const chaser = chasers[i]!;
    if (chaser.x === playerX && chaser.y === playerY) {
      if (chaser.mode === "frightened") {
        const home = HOME_CORNERS[chaser.id] ?? { x: 1, y: 1 };
        const spawn = PEN_SPAWNS[chaser.id] ?? PEN_SPAWNS[0]!;
        chasers = chasers.slice();
        chasers[i] = {
          ...chaser,
          x: spawn.x,
          y: spawn.y,
          direction: "none",
          mode: "scatter",
          homeX: home.x,
          homeY: home.y,
        };
        score += POINTS_PER_CHASER;
      } else {
        lives -= 1;
        if (lives <= 0) {
          status = "over";
        } else {
          const resetState = respawnPositions({
            ...state,
            grid,
            score,
            dotsRemaining,
            lives,
            status: "playing",
          });
          return resetState;
        }
      }
      break;
    }
  }

  if (dotsRemaining <= 0) {
    status = "won";
  }

  return {
    ...state,
    grid,
    playerX,
    playerY,
    playerDirection,
    queuedDirection: state.queuedDirection,
    chasers,
    frightenedTimer,
    modeTimer,
    score,
    dotsRemaining,
    lives,
    status,
  };
}
