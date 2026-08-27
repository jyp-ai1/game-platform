/**
 * MP-PLATFORM-001 — viewport canvas path for snakes + gems.
 * Avoids React DOM per-segment / per-food nodes (L300+ main-thread spike).
 */
import { SNAKE_MVP_RC1 } from "./snake-mvp-rc1";
import { segmentBodyColor, resolveHeadEmoji } from "./snake-characters";
import { getFoodVisual, tierFromKind, type FoodTier } from "./snake-food-types";
import { SNAKE_FEEL } from "./snake-feel-tuning";
import {
  captureSnakeSnapshot,
  interpolateSnakeRender,
  lerpSegments,
  type FoodItem,
  type SnakeEntity,
  type SnakeIoWorld,
  type Vec,
} from "./snake-io-engine";

export type SnakeSnap = ReturnType<typeof captureSnakeSnapshot>;

export interface WorldCanvasDrawInput {
  ctx: CanvasRenderingContext2D;
  world: SnakeIoWorld;
  camX: number;
  camY: number;
  cellSize: number;
  boardW: number;
  boardH: number;
  renderAlpha: number;
  deviceId: string;
  prevSnaps: Record<string, SnakeSnap>;
  prevSegments: Record<string, Vec[]>;
  growthUntil: Record<string, number>;
  eatPopUntil: Record<string, number>;
  spawnHighlightUntil: number;
  /** Soft cap for ambient gem draws; death gems in view always preferred. */
  foodBudget?: number;
}

export interface WorldCanvasStats {
  frameMs: number;
  segmentDrawCount: number;
  foodDrawCount: number;
  foodTotal: number;
  deathFoodTotal: number;
  snakeCount: number;
  localLength: number;
}

let lastStats: WorldCanvasStats = {
  frameMs: 0,
  segmentDrawCount: 0,
  foodDrawCount: 0,
  foodTotal: 0,
  deathFoodTotal: 0,
  snakeCount: 0,
  localLength: 0,
};

export function getWorldCanvasStats(): WorldCanvasStats {
  return lastStats;
}

function worldToScreen(wx: number, wy: number, camX: number, camY: number, cellSize: number): {
  x: number;
  y: number;
} {
  return { x: wx * cellSize - camX, y: wy * cellSize - camY };
}

function inView(
  wx: number,
  wy: number,
  camX: number,
  camY: number,
  cellSize: number,
  boardW: number,
  boardH: number,
  marginPx: number
): boolean {
  const s = worldToScreen(wx, wy, camX, camY, cellSize);
  return s.x >= -marginPx && s.x <= boardW + marginPx && s.y >= -marginPx && s.y <= boardH + marginPx;
}

function collectVisibleFoods(
  food: FoodItem[],
  camX: number,
  camY: number,
  cellSize: number,
  boardW: number,
  boardH: number,
  budget: number
): FoodItem[] {
  const margin = cellSize * 3;
  const visible: FoodItem[] = [];
  for (let i = 0; i < food.length; i++) {
    const f = food[i]!;
    if (!inView(f.x, f.y, camX, camY, cellSize, boardW, boardH, margin)) continue;
    visible.push(f);
  }
  if (visible.length <= budget) return visible;
  // Prefer death gems so on-screen corpse loot stays visible under budget.
  visible.sort((a, b) => (a.tier === "death" ? 0 : 1) - (b.tier === "death" ? 0 : 1));
  return visible.slice(0, budget);
}

function drawGem(
  ctx: CanvasRenderingContext2D,
  f: FoodItem,
  camX: number,
  camY: number,
  cellSize: number,
  myHead: Vec | null,
  boosting: boolean
): void {
  const tier: FoodTier = f.tier ?? tierFromKind(f.kind, f.value);
  const vis = getFoodVisual(tier);
  const size = Math.max(vis.sizePx, cellSize * (vis.sizePx / 18));
  const s = worldToScreen(f.x, f.y, camX, camY, cellSize);
  const magnetR = boosting ? SNAKE_FEEL.magnetRadiusBoost : SNAKE_FEEL.magnetRadius;
  const fd = myHead ? Math.hypot(f.x - myHead.x, f.y - myHead.y) : 999;
  const magneted = fd < magnetR && fd > 0.05;
  const magnetScale = magneted ? 1 + (1 - fd / magnetR) * 0.4 : 1;
  const r = (size * magnetScale) / 2;
  ctx.beginPath();
  ctx.arc(s.x + cellSize / 2, s.y + cellSize / 2, r, 0, Math.PI * 2);
  ctx.fillStyle = vis.color;
  ctx.globalAlpha = magneted ? 0.85 + (1 - fd / magnetR) * 0.15 : 1;
  ctx.fill();
  if (tier === "death") {
    ctx.strokeStyle = "rgba(248,113,113,0.7)";
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (tier !== "small") {
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawSnakeBody(
  ctx: CanvasRenderingContext2D,
  snake: SnakeEntity,
  segs: Vec[],
  camX: number,
  camY: number,
  cellSize: number,
  boardW: number,
  boardH: number,
  opts: {
    isMe: boolean;
    highlight: boolean;
    growthScaleTail: number;
    eatPopScale: number;
  }
): number {
  const len = segs.length;
  if (len === 0) return 0;
  const radiusScale = snake.bodyRadiusScale ?? 1;
  const margin = cellSize * 2;
  // L300 perf: skip sub-pixel tail segments when body is long (head/tail always drawn)
  const tailStride = len > 240 ? 3 : len > 120 ? 2 : 1;
  let drawn = 0;
  // Draw tail → head so head paints on top
  for (let i = len - 1; i >= 0; i--) {
    const isHead = i === 0;
    const isTail = i === len - 1;
    if (tailStride > 1 && !isHead && !isTail && i % tailStride !== 0) continue;
    const seg = segs[i]!;
    if (!inView(seg.x, seg.y, camX, camY, cellSize, boardW, boardH, margin)) continue;
    const segBase = cellSize * 0.72;
    const segSize = isHead
      ? segBase * SNAKE_MVP_RC1.headScale
      : isTail
        ? segBase * SNAKE_MVP_RC1.tailScale
        : segBase * SNAKE_MVP_RC1.bodyScale;
    const growthScale = opts.growthScaleTail !== 1 && i >= len - 2 ? opts.growthScaleTail : 1;
    const size = segSize * radiusScale * opts.eatPopScale * growthScale;
    const pulse = opts.highlight ? 1 + Math.sin(Date.now() / 120) * 0.12 : 1;
    const fill = segmentBodyColor(snake, i);
    const s = worldToScreen(seg.x, seg.y, camX, camY, cellSize);
    const cx = s.x + cellSize / 2;
    const cy = s.y + cellSize / 2;
    const r = (size * pulse) / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.globalAlpha = isTail ? 0.75 : isHead ? 1 : 0.92;
    ctx.fill();
    if (opts.isMe) {
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (isHead && snake.boosting) {
      ctx.strokeStyle = "rgba(252,211,77,0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (isHead && snake.headCharacter) {
      ctx.globalAlpha = 1;
      ctx.font = `${Math.max(8, size * 0.72)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(resolveHeadEmoji(snake.headCharacter), cx, cy);
    }
    drawn += 1;
  }
  ctx.globalAlpha = 1;
  return drawn;
}

/**
 * Draw foods + snake bodies into a viewport-sized canvas (camera baked into coords).
 * Collision list remains `world.food` unchanged — render is a filtered view of the same items.
 */
export function drawWorldCanvas(input: WorldCanvasDrawInput): WorldCanvasStats {
  const t0 = performance.now();
  const {
    ctx,
    world,
    camX,
    camY,
    cellSize,
    boardW,
    boardH,
    renderAlpha,
    deviceId,
    prevSnaps,
    prevSegments,
    growthUntil,
    eatPopUntil,
    spawnHighlightUntil,
    foodBudget = 420,
  } = input;

  ctx.clearRect(0, 0, boardW, boardH);

  const mySnake = world.snakes[deviceId];
  const myHead = mySnake?.segments[0] ?? null;
  const boosting = !!(mySnake?.boosting && mySnake.alive);

  const foods = collectVisibleFoods(world.food, camX, camY, cellSize, boardW, boardH, foodBudget);
  for (let i = 0; i < foods.length; i++) {
    drawGem(ctx, foods[i]!, camX, camY, cellSize, myHead, boosting);
  }

  let segmentDrawCount = 0;
  let snakeCount = 0;
  const now = Date.now();
  for (const snake of Object.values(world.snakes)) {
    if (!snake.alive || snake.spectating) continue;
    snakeCount += 1;
    const snap = prevSnaps[snake.deviceId];
    const segs = snap
      ? interpolateSnakeRender(snake, snap, renderAlpha)
      : lerpSegments(
          prevSegments[snake.deviceId],
          snake.segments,
          renderAlpha,
          Math.min(1, renderAlpha * (SNAKE_FEEL.headLerpStep / SNAKE_FEEL.segmentLerpStep)),
          snake.boosting ? SNAKE_FEEL.tailWaveAmpBoost : SNAKE_FEEL.tailWaveAmp
        );
    const growing = (growthUntil[snake.deviceId] ?? 0) > now;
    const growthLeft = (growthUntil[snake.deviceId] ?? 0) - now;
    const tailPopScale = growing
      ? 0.9 + Math.sin((1 - Math.max(0, growthLeft) / SNAKE_FEEL.growthAnimMs) * Math.PI) * 0.2
      : 1;
    const eatPopLeft = (eatPopUntil[snake.deviceId] ?? 0) - now;
    const eatPopScale =
      eatPopLeft > 0
        ? 1 +
          (SNAKE_FEEL.eatPopPeak - 1) *
            Math.sin((1 - Math.max(0, eatPopLeft) / SNAKE_FEEL.eatPopAnimMs) * Math.PI)
        : 1;
    const isMe = snake.deviceId === deviceId;
    const highlight = isMe && spawnHighlightUntil > now;
    segmentDrawCount += drawSnakeBody(ctx, snake, segs, camX, camY, cellSize, boardW, boardH, {
      isMe,
      highlight,
      growthScaleTail: tailPopScale,
      eatPopScale,
    });
  }

  let deathFoodTotal = 0;
  for (const f of world.food) {
    if (f.tier === "death") deathFoodTotal += 1;
  }

  lastStats = {
    frameMs: performance.now() - t0,
    segmentDrawCount,
    foodDrawCount: foods.length,
    foodTotal: world.food.length,
    deathFoodTotal,
    snakeCount,
    localLength: mySnake ? mySnake.segmentCount ?? mySnake.segments.length : 0,
  };
  return lastStats;
}
