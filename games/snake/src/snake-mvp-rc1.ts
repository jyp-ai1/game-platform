/** Snake MVP RC1 — fixed spec. All gameplay tuning references this file. */

export const SNAKE_MVP_RC1 = {
  /** Initial worm — 10 segments, ~5px spacing at default cell size */
  startingSegments: 10,
  /** World-units between path samples (~5px when cellSize ≈ 10) */
  segmentSpacing: 0.5,
  headScale: 1.5,
  bodyScale: 1.0,
  tailScale: 0.8,
  /** Movement @ 20Hz — base slightly above prior 2.9 tune */
  baseSpeed: 3.2,
  boostSpeedMult: 2.0,
  /** 2 food pickups → +1 segment */
  growthFoodPerSegment: 2,
  cameraFollowLerp: 0.14,
  /** Humans never auto-respawn — Retry button only */
  humanAutoRespawn: false,
} as const;

export function resolveSnakeHead(snake: { headX?: number; headY?: number; segments: { x: number; y: number }[] } | undefined): { x: number; y: number } | null {
  if (!snake) return null;
  if (snake.headX != null && snake.headY != null) return { x: snake.headX, y: snake.headY };
  return snake.segments[0] ?? null;
}
