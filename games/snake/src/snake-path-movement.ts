/** Slither-like path follow — float coords, smooth turn, body samples path distance. */
import type { Direction, SnakeEntity, Vec } from "./snake-io-engine";
import { SNAKE_FEEL } from "./snake-feel-tuning";

export function directionToAngle(dir: Direction): number {
  switch (dir) {
    case "right": return 0;
    case "down": return Math.PI / 2;
    case "left": return Math.PI;
    case "up": return -Math.PI / 2;
  }
}

export function angleToDirection(angle: number): Direction {
  const deg = ((angle * 180) / Math.PI + 360) % 360;
  if (deg >= 45 && deg < 135) return "down";
  if (deg >= 135 && deg < 225) return "left";
  if (deg >= 225 && deg < 315) return "up";
  return "right";
}

function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/** Sample a point `dist` world-units behind the head along the path trail. */
export function samplePathAtDistance(
  path: Vec[],
  headX: number,
  headY: number,
  dist: number
): Vec {
  if (dist <= 0.001) return { x: headX, y: headY };
  let remaining = dist;
  let ax = headX;
  let ay = headY;
  for (const pt of path) {
    const dx = ax - pt.x;
    const dy = ay - pt.y;
    const segLen = Math.hypot(dx, dy);
    if (segLen < 0.0001) continue;
    if (remaining <= segLen) {
      const t = remaining / segLen;
      return { x: ax - dx * t, y: ay - dy * t };
    }
    remaining -= segLen;
    ax = pt.x;
    ay = pt.y;
  }
  return { x: ax, y: ay };
}

export function getSegmentCount(snake: SnakeEntity): number {
  return snake.segmentCount ?? snake.segments.length;
}

export function syncSegmentsFromPath(snake: SnakeEntity): void {
  const hx = snake.headX ?? snake.segments[0]?.x ?? 0;
  const hy = snake.headY ?? snake.segments[0]?.y ?? 0;
  const spacing = SNAKE_FEEL.segmentSpacing;
  const count = getSegmentCount(snake);
  const path = snake.path ?? [];
  const segs: Vec[] = [];
  for (let i = 0; i < count; i++) {
    segs.push(samplePathAtDistance(path, hx, hy, i * spacing));
  }
  if (segs.length === 0) segs.push({ x: hx, y: hy });
  snake.segments = segs;
  snake.headX = hx;
  snake.headY = hy;
}

export function initSnakePath(snake: SnakeEntity, x: number, y: number, angle = 0): void {
  snake.headX = x;
  snake.headY = y;
  snake.angle = angle;
  snake.desiredAngle = angle;
  snake.direction = angleToDirection(angle);
  snake.pendingDirection = snake.direction;
  snake.path = [];
  const spacing = SNAKE_FEEL.segmentSpacing;
  const count = getSegmentCount(snake);
  for (let i = 0; i < Math.max(80, count * 8); i++) {
    snake.path.push({
      x: x - Math.cos(angle) * i * spacing * 0.12,
      y: y - Math.sin(angle) * i * spacing * 0.12,
    });
  }
  syncSegmentsFromPath(snake);
}

export function ensureSnakePath(snake: SnakeEntity): void {
  if (snake.headX != null && snake.path?.length) return;
  const head = snake.segments[0];
  if (!head) return;
  const angle = snake.angle ?? directionToAngle(snake.direction);
  snake.segmentCount = snake.segmentCount ?? snake.segments.length;
  initSnakePath(snake, head.x + 0.5, head.y + 0.5, angle);
}

/** Lerp desired angle, advance head, record path, resample body segments. */
export function advanceSnakePath(
  snake: SnakeEntity,
  speed: number,
  dt = 1
): void {
  ensureSnakePath(snake);
  const desired = snake.desiredAngle ?? directionToAngle(snake.pendingDirection);
  let angle = snake.angle ?? desired;
  let diff = normalizeAngle(desired - angle);
  const boosting = !!snake.boosting;
  const maxTurn =
    SNAKE_FEEL.maxTurnRadiansPerTick * (boosting ? SNAKE_FEEL.boostTurnMult : 1);
  if (Math.abs(diff) > maxTurn) {
    diff = Math.sign(diff) * maxTurn;
  }
  angle += diff;
  snake.angle = angle;
  snake.direction = angleToDirection(angle);
  snake.desiredAngle = desired;

  const hx = (snake.headX ?? 0) + Math.cos(angle) * speed * dt;
  const hy = (snake.headY ?? 0) + Math.sin(angle) * speed * dt;
  snake.headX = hx;
  snake.headY = hy;

  if (!snake.path) snake.path = [];
  snake.path.unshift({ x: hx, y: hy });
  const maxLen = Math.ceil(getSegmentCount(snake) * SNAKE_FEEL.segmentSpacing * 12) + 60;
  if (snake.path.length > maxLen) snake.path.length = maxLen;

  syncSegmentsFromPath(snake);
}

/** Smoothstep for render interpolation between physics ticks. */
function smoothRenderAlpha(alpha: number): number {
  const t = Math.max(0, Math.min(1, alpha));
  return t * t * (3 - 2 * t);
}

/** Interpolate head + path for 60fps render between physics ticks. */
export function interpolateSnakeRender(
  snake: SnakeEntity,
  prev: { headX: number; headY: number; angle: number; segmentCount: number; path: Vec[] } | undefined,
  alpha: number
): Vec[] {
  const blend = smoothRenderAlpha(alpha);
  if (!prev || blend >= 1) return snake.segments.map((s) => ({ ...s }));
  const hx = prev.headX + ((snake.headX ?? 0) - prev.headX) * blend;
  const hy = prev.headY + ((snake.headY ?? 0) - prev.headY) * blend;
  const pa = prev.angle;
  let da = (snake.angle ?? pa) - pa;
  da = normalizeAngle(da);
  const angle = pa + da * blend;
  const spacing = SNAKE_FEEL.segmentSpacing;
  const count = getSegmentCount(snake);
  const blendPath: Vec[] = [];
  const maxP = Math.max(prev.path.length, snake.path?.length ?? 0);
  for (let i = 0; i < maxP; i++) {
    const p0 = prev.path[i] ?? prev.path[prev.path.length - 1] ?? { x: prev.headX, y: prev.headY };
    const p1 = snake.path?.[i] ?? snake.path?.[(snake.path?.length ?? 1) - 1] ?? { x: snake.headX ?? 0, y: snake.headY ?? 0 };
    blendPath.push({ x: p0.x + (p1.x - p0.x) * blend, y: p0.y + (p1.y - p0.y) * blend });
  }
  const segs: Vec[] = [];
  for (let i = 0; i < count; i++) {
    segs.push(samplePathAtDistance(blendPath, hx, hy, i * spacing));
  }
  return segs.length > 0 ? segs : [{ x: hx, y: hy }];
}

export function captureSnakeSnapshot(snake: SnakeEntity) {
  return {
    headX: snake.headX ?? snake.segments[0]?.x ?? 0,
    headY: snake.headY ?? snake.segments[0]?.y ?? 0,
    angle: snake.angle ?? 0,
    segmentCount: getSegmentCount(snake),
    path: (snake.path ?? []).map((p) => ({ ...p })),
  };
}
