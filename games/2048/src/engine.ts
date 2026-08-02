export const GRID_SIZE = 4;
export const WIN_VALUE = 2048;

export type Difficulty2048 = "easy" | "normal" | "hard";

const FOUR_TILE_CHANCE: Record<Difficulty2048, number> = {
  easy: 0.03,
  normal: 0.1,
  hard: 0.25,
};

export function fourTileChance(
  difficulty: Difficulty2048,
  maxTile = 2
): number {
  const base = FOUR_TILE_CHANCE[difficulty];
  if (difficulty !== "hard") {
    return base;
  }
  // Hard spawn curve: more 4-tiles as the board fills with high values.
  const tier = Math.max(0, Math.floor(Math.log2(Math.max(maxTile, 8))) - 7);
  return Math.min(0.35, base + tier * 0.025);
}

export type Grid = number[][];
export type Direction = "up" | "down" | "left" | "right";

export interface MoveResult {
  grid: Grid;
  scoreGained: number;
  moved: boolean;
}

export function createEmptyGrid(size: number = GRID_SIZE): Grid {
  return Array.from({ length: size }, () => Array<number>(size).fill(0));
}

function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

// Grid is always a square GRID_SIZE x GRID_SIZE array, so indexed access
// below is always in bounds — the `!` assertions reflect that invariant
// rather than disabling noUncheckedIndexedAccess project-wide.

function gridsEqual(a: Grid, b: Grid): boolean {
  return a.every((row, r) => row.every((value, c) => value === b[r]![c]));
}

function transpose(grid: Grid): Grid {
  return grid[0]!.map((_, colIndex) => grid.map((row) => row[colIndex]!));
}

function reverseRows(grid: Grid): Grid {
  return grid.map((row) => [...row].reverse());
}

// Slides all non-zero values to the start of the line, merging equal
// adjacent pairs once per move (classic 2048 rule).
function slideAndMergeLine(line: number[]): { line: number[]; scoreGained: number } {
  const values = line.filter((value) => value !== 0);
  const merged: number[] = [];
  let scoreGained = 0;

  for (let i = 0; i < values.length; i++) {
    const current = values[i]!;
    const next = values[i + 1];
    if (next !== undefined && next === current) {
      const mergedValue = current * 2;
      merged.push(mergedValue);
      scoreGained += mergedValue;
      i++;
    } else {
      merged.push(current);
    }
  }

  while (merged.length < line.length) {
    merged.push(0);
  }

  return { line: merged, scoreGained };
}

export function move(grid: Grid, direction: Direction): MoveResult {
  let working = cloneGrid(grid);

  if (direction === "up" || direction === "down") {
    working = transpose(working);
  }
  if (direction === "right" || direction === "down") {
    working = reverseRows(working);
  }

  let scoreGained = 0;
  let result = working.map((row) => {
    const { line, scoreGained: gained } = slideAndMergeLine(row);
    scoreGained += gained;
    return line;
  });

  if (direction === "right" || direction === "down") {
    result = reverseRows(result);
  }
  if (direction === "up" || direction === "down") {
    result = transpose(result);
  }

  return { grid: result, scoreGained, moved: !gridsEqual(grid, result) };
}

export function addRandomTile(
  grid: Grid,
  difficulty: Difficulty2048 = "normal"
): Grid {
  const emptyCells: Array<[number, number]> = [];
  grid.forEach((row, r) =>
    row.forEach((value, c) => {
      if (value === 0) {
        emptyCells.push([r, c]);
      }
    })
  );

  if (emptyCells.length === 0) {
    return grid;
  }

  const [r, c] = emptyCells[Math.floor(Math.random() * emptyCells.length)]!;
  const next = cloneGrid(grid);
  const chance = fourTileChance(difficulty, maxTile(grid));
  next[r]![c] = Math.random() < chance ? 4 : 2;
  return next;
}

export function createInitialGrid(difficulty: Difficulty2048 = "normal"): Grid {
  return addRandomTile(addRandomTile(createEmptyGrid(), difficulty), difficulty);
}

export function hasMovesAvailable(grid: Grid): boolean {
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r]!;
    for (let c = 0; c < row.length; c++) {
      if (row[c] === 0) {
        return true;
      }
      if (c + 1 < row.length && row[c] === row[c + 1]) {
        return true;
      }
      if (r + 1 < grid.length && row[c] === grid[r + 1]![c]) {
        return true;
      }
    }
  }
  return false;
}

export function hasWon(grid: Grid, target: number = WIN_VALUE): boolean {
  return grid.some((row) => row.some((value) => value >= target));
}

export function maxTile(grid: Grid): number {
  let max = 0;
  for (const row of grid) {
    for (const value of row) {
      if (value > max) max = value;
    }
  }
  return max;
}
