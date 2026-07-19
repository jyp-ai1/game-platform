export type BubbleColor = "red" | "blue" | "green" | "yellow" | "purple";

export const COLORS: BubbleColor[] = ["red", "blue", "green", "yellow", "purple"];

export const COLS = 8;
export const ROWS = 12; // playable grid height before "bottom line" loss

export const FIELD_WIDTH = 320;
export const FIELD_HEIGHT = 440;
export const BUBBLE_SIZE = FIELD_WIDTH / COLS; // bubble diameter
export const BUBBLE_RADIUS = BUBBLE_SIZE / 2;

export const SHOOTER_X = FIELD_WIDTH / 2;
export const SHOOTER_Y = FIELD_HEIGHT - BUBBLE_RADIUS;
export const MAX_AIM_ANGLE = 1.3; // radians from straight-up
export const FLYING_SPEED = 260; // px/sec
export const SHOTS_PER_CEILING_DROP = 8;
export const POINTS_PER_POP = 10;
export const POINTS_PER_FLOATING = 20;
export const MIN_MATCH_SIZE = 3;
export const INITIAL_FILLED_ROWS = 5;

export interface FlyingBubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: BubbleColor;
}

export type BubblePopStatus = "playing" | "over" | "won";

export interface BubblePopState {
  grid: (BubbleColor | null)[][]; // [row][col], row 0 = top (attached to ceiling)
  shooterAngle: number; // radians, measured from straight-up
  currentColor: BubbleColor;
  nextColor: BubbleColor;
  flyingBubble: FlyingBubble | null;
  score: number;
  shotsUntilCeilingDrop: number;
  status: BubblePopStatus;
}

function randomColor(): BubbleColor {
  return COLORS[Math.floor(Math.random() * COLORS.length)]!;
}

function createEmptyGrid(): (BubbleColor | null)[][] {
  return Array.from({ length: ROWS }, () => Array<BubbleColor | null>(COLS).fill(null));
}

export function createInitialState(): BubblePopState {
  const grid = createEmptyGrid();
  for (let row = 0; row < INITIAL_FILLED_ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      grid[row]![col] = randomColor();
    }
  }
  return {
    grid,
    shooterAngle: 0,
    currentColor: randomColor(),
    nextColor: randomColor(),
    flyingBubble: null,
    score: 0,
    shotsUntilCeilingDrop: SHOTS_PER_CEILING_DROP,
    status: "playing",
  };
}

export function setShooterAngle(state: BubblePopState, angle: number): BubblePopState {
  const clamped = Math.max(-MAX_AIM_ANGLE, Math.min(MAX_AIM_ANGLE, angle));
  if (clamped === state.shooterAngle) {
    return state;
  }
  return { ...state, shooterAngle: clamped };
}

/**
 * Hex-offset neighbor rule for a 2D-array approximation of a hex-packed
 * grid, where ODD rows are rendered shifted right by half a bubble width.
 *
 * - Same row: col - 1, col + 1
 * - Even row: row above/below neighbors are at columns [col - 1, col]
 * - Odd row: row above/below neighbors are at columns [col, col + 1]
 */
export function neighborsOf(row: number, col: number): Array<[number, number]> {
  const isOdd = row % 2 === 1;
  const vertical: Array<[number, number]> = isOdd
    ? [
        [row - 1, col],
        [row - 1, col + 1],
        [row + 1, col],
        [row + 1, col + 1],
      ]
    : [
        [row - 1, col - 1],
        [row - 1, col],
        [row + 1, col - 1],
        [row + 1, col],
      ];
  return [
    [row, col - 1],
    [row, col + 1],
    ...vertical,
  ];
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS;
}

function floodFillSameColor(
  grid: (BubbleColor | null)[][],
  startRow: number,
  startCol: number
): Array<[number, number]> {
  const color = grid[startRow]?.[startCol];
  if (!color) {
    return [];
  }
  const visited = new Set<string>();
  const stack: Array<[number, number]> = [[startRow, startCol]];
  const result: Array<[number, number]> = [];
  visited.add(`${startRow},${startCol}`);

  while (stack.length > 0) {
    const [row, col] = stack.pop()!;
    result.push([row, col]);
    for (const [nr, nc] of neighborsOf(row, col)) {
      if (!inBounds(nr, nc)) {
        continue;
      }
      const key = `${nr},${nc}`;
      if (visited.has(key)) {
        continue;
      }
      if (grid[nr]?.[nc] === color) {
        visited.add(key);
        stack.push([nr, nc]);
      }
    }
  }

  return result;
}

function findFloatingBubbles(
  grid: (BubbleColor | null)[][]
): Array<[number, number]> {
  const anchored = new Set<string>();
  const stack: Array<[number, number]> = [];

  for (let col = 0; col < COLS; col++) {
    if (grid[0]?.[col]) {
      stack.push([0, col]);
      anchored.add(`0,${col}`);
    }
  }

  while (stack.length > 0) {
    const [row, col] = stack.pop()!;
    for (const [nr, nc] of neighborsOf(row, col)) {
      if (!inBounds(nr, nc)) {
        continue;
      }
      const key = `${nr},${nc}`;
      if (anchored.has(key)) {
        continue;
      }
      if (grid[nr]?.[nc]) {
        anchored.add(key);
        stack.push([nr, nc]);
      }
    }
  }

  const floating: Array<[number, number]> = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (grid[row]?.[col] && !anchored.has(`${row},${col}`)) {
        floating.push([row, col]);
      }
    }
  }
  return floating;
}

function isGridEmpty(grid: (BubbleColor | null)[][]): boolean {
  return grid.every((row) => row.every((cell) => cell === null));
}

export function fireBubble(state: BubblePopState): BubblePopState {
  if (state.flyingBubble !== null || state.status !== "playing") {
    return state;
  }

  const angle = state.shooterAngle;
  const flyingBubble: FlyingBubble = {
    x: SHOOTER_X,
    y: SHOOTER_Y,
    vx: Math.sin(angle) * FLYING_SPEED,
    vy: -Math.cos(angle) * FLYING_SPEED,
    color: state.currentColor,
  };

  let grid = state.grid;
  let shotsUntilCeilingDrop = state.shotsUntilCeilingDrop - 1;
  let status: BubblePopStatus = state.status;

  if (shotsUntilCeilingDrop <= 0) {
    // Check whether shifting the grid down one row would push any bubble
    // past the bottom of the playable area — if so, that's an immediate loss.
    const wouldOverflow = grid[ROWS - 1]?.some((cell) => cell !== null) ?? false;
    if (wouldOverflow) {
      status = "over";
    } else {
      const shifted = createEmptyGrid();
      for (let row = 0; row < ROWS - 1; row++) {
        shifted[row + 1] = grid[row]!.slice();
      }
      // New row of empty cells appears at the ceiling.
      grid = shifted;
    }
    shotsUntilCeilingDrop = SHOTS_PER_CEILING_DROP;
  }

  return {
    ...state,
    grid,
    flyingBubble,
    currentColor: state.nextColor,
    nextColor: randomColor(),
    shotsUntilCeilingDrop,
    status,
  };
}

function nearestCell(x: number, y: number): [number, number] {
  const row = Math.max(0, Math.min(ROWS - 1, Math.round(y / BUBBLE_SIZE - 0.5)));
  const isOdd = row % 2 === 1;
  const offset = isOdd ? BUBBLE_RADIUS : 0;
  const col = Math.max(0, Math.min(COLS - 1, Math.round((x - offset) / BUBBLE_SIZE - 0.5)));
  return [row, col];
}

function findOpenCellNear(
  grid: (BubbleColor | null)[][],
  row: number,
  col: number
): [number, number] {
  if (inBounds(row, col) && grid[row]?.[col] == null) {
    return [row, col];
  }
  // Search outward (candidate cell + its neighbors) for the nearest open slot.
  const candidates: Array<[number, number]> = [[row, col], ...neighborsOf(row, col)];
  for (const [r, c] of candidates) {
    if (inBounds(r, c) && grid[r]?.[c] == null) {
      return [r, c];
    }
  }
  return [row, col];
}

export function step(state: BubblePopState, dtSeconds: number): BubblePopState {
  if (!state.flyingBubble) {
    return state;
  }

  let { x, y, vx, vy } = state.flyingBubble;
  const color = state.flyingBubble.color;

  x += vx * dtSeconds;
  y += vy * dtSeconds;

  if (x - BUBBLE_RADIUS < 0) {
    x = BUBBLE_RADIUS;
    vx = Math.abs(vx);
  } else if (x + BUBBLE_RADIUS > FIELD_WIDTH) {
    x = FIELD_WIDTH - BUBBLE_RADIUS;
    vx = -Math.abs(vx);
  }

  let hitCeiling = y - BUBBLE_RADIUS <= 0;
  let hitExisting = false;

  if (!hitCeiling) {
    outer: for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (!state.grid[row]?.[col]) {
          continue;
        }
        const isOdd = row % 2 === 1;
        const cx = col * BUBBLE_SIZE + BUBBLE_RADIUS + (isOdd ? BUBBLE_RADIUS : 0);
        const cy = row * BUBBLE_SIZE + BUBBLE_RADIUS;
        const dx = x - cx;
        const dy = y - cy;
        if (Math.sqrt(dx * dx + dy * dy) <= BUBBLE_SIZE * 0.98) {
          hitExisting = true;
          break outer;
        }
      }
    }
  }

  if (!hitCeiling && !hitExisting) {
    return { ...state, flyingBubble: { x, y, vx, vy, color } };
  }

  // Snap into the grid.
  const [nearRow, nearCol] = nearestCell(x, y);
  const [row, col] = findOpenCellNear(state.grid, nearRow, nearCol);

  const grid = state.grid.map((r) => r.slice());
  grid[row]![col] = color;

  let score = state.score;

  const group = floodFillSameColor(grid, row, col);
  if (group.length >= MIN_MATCH_SIZE) {
    for (const [r, c] of group) {
      grid[r]![c] = null;
    }
    score += POINTS_PER_POP * group.length;
  }

  const floating = findFloatingBubbles(grid);
  if (floating.length > 0) {
    for (const [r, c] of floating) {
      grid[r]![c] = null;
    }
    score += POINTS_PER_FLOATING * floating.length;
  }

  let status: BubblePopStatus = state.status;
  const reachedBottom = grid[ROWS - 1]?.some((cell) => cell !== null) ?? false;
  if (reachedBottom) {
    status = "over";
  } else if (isGridEmpty(grid)) {
    status = "won";
  }

  return {
    ...state,
    grid,
    flyingBubble: null,
    score,
    status,
  };
}
