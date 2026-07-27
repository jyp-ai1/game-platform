/** Snake MVP RC1 — fixed spec. All gameplay tuning references this file. */

export const SNAKE_MVP_RC1 = {
  /** Initial worm — 10–12 segments, ~5px spacing at default cell size */
  startingSegments: 12,
  /** World-units between path samples (~5px when cellSize ≈ 10) */
  segmentSpacing: 0.5,
  headScale: 1.5,
  bodyScale: 1.0,
  tailScale: 0.8,
  /** Movement @ 20Hz — RC5: slither-like pace */
  baseSpeed: 1.0,
  boostSpeedMult: 1.2,
  /** 2 food pickups → +1 segment */
  growthFoodPerSegment: 2,
  growthAnimMs: 200,
  cameraFollowLerp: 0.09,
  spawnHighlightMs: 2000,
  spawnSafeMs: 2000,
  /** Humans never auto-respawn — Retry button only */
  humanAutoRespawn: false,
} as const;

export function resolveSnakeHead(snake: { headX?: number; headY?: number; segments: { x: number; y: number }[] } | undefined): { x: number; y: number } | null {
  if (!snake) return null;
  if (snake.headX != null && snake.headY != null) return { x: snake.headX, y: snake.headY };
  return snake.segments[0] ?? null;
}
