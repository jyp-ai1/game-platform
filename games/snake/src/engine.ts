export const GRID_SIZE = 20;

export type Direction = "up" | "down" | "left" | "right";

export interface Position {
  x: number;
  y: number;
}

const DELTAS: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function isOpposite(a: Direction, b: Direction): boolean {
  const da = DELTAS[a];
  const db = DELTAS[b];
  return da.x === -db.x && da.y === -db.y;
}

export function createInitialSnake(): Position[] {
  const mid = Math.floor(GRID_SIZE / 2);
  return [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
}

function isSnakeCell(snake: Position[], pos: Position): boolean {
  return snake.some((segment) => segment.x === pos.x && segment.y === pos.y);
}

export function placeFood(snake: Position[]): Position {
  const emptyCells: Position[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const pos = { x, y };
      if (!isSnakeCell(snake, pos)) {
        emptyCells.push(pos);
      }
    }
  }
  return emptyCells[Math.floor(Math.random() * emptyCells.length)]!;
}

export interface TickResult {
  snake: Position[];
  ateFood: boolean;
  gameOver: boolean;
}

export function tick(
  snake: Position[],
  direction: Direction,
  food: Position
): TickResult {
  const head = snake[0]!;
  const delta = DELTAS[direction];
  const nextHead: Position = { x: head.x + delta.x, y: head.y + delta.y };

  const hitWall =
    nextHead.x < 0 ||
    nextHead.x >= GRID_SIZE ||
    nextHead.y < 0 ||
    nextHead.y >= GRID_SIZE;

  const ateFood = nextHead.x === food.x && nextHead.y === food.y;
  // The tail cell vacates this tick unless the snake is growing (ate food),
  // so it shouldn't count as a collision target in that case.
  const bodyToCheck = ateFood ? snake : snake.slice(0, -1);
  const hitSelf = isSnakeCell(bodyToCheck, nextHead);

  if (hitWall || hitSelf) {
    return { snake, ateFood: false, gameOver: true };
  }

  const nextSnake = ateFood
    ? [nextHead, ...snake]
    : [nextHead, ...snake.slice(0, -1)];

  return { snake: nextSnake, ateFood, gameOver: false };
}
