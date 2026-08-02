/** RC-014/015 — Human spawn render visibility + random world spawn */
import {
  getSegmentCount,
  rehydrateWorldSnakes,
  type SnakeIoWorld,
} from "./snake-io-engine";
import { initSnakePath, syncSegmentsFromPath } from "./snake-path-movement";
import { resolveSnakeHead, SNAKE_MVP_RC1 } from "./snake-mvp-rc1";

/** If segments empty, rebuild from head before render. */
export function ensureRenderableLocalSnake(world: SnakeIoWorld, deviceId: string): boolean {
  const snake = world.snakes[deviceId];
  if (!snake) return false;
  if (snake.segments.length === 0 || getSegmentCount(snake) === 0) {
    const w = world.config.worldSize;
    const hx = snake.headX ?? snake.segments[0]?.x ?? w / 2;
    const hy = snake.headY ?? snake.segments[0]?.y ?? w / 2;
    snake.segmentCount = Math.max(
      snake.segmentCount ?? 0,
      world.living?.matchRule.startingSegments ?? SNAKE_MVP_RC1.startingSegments
    );
    initSnakePath(snake, hx, hy, snake.angle ?? 0);
  }
  rehydrateWorldSnakes(world);
  snake.bodyRadiusScale = 1;
  return snake.segments.length > 0;
}

export interface Rc014SpawnDiag {
  spawn: "OK" | "FAIL";
  camera: "OK" | "FAIL";
  segments: number;
  visible: "YES" | "NO";
  tick: number;
  sim: "OK" | "FAIL";
}

export function diagnoseLocalSpawn(
  world: SnakeIoWorld | null | undefined,
  deviceId: string,
  cellSize: number,
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
  tickAdvancing: boolean
): Rc014SpawnDiag {
  const snake = world?.snakes[deviceId];
  const renderSegs = snake?.segments.length ?? 0;
  const segCount = snake ? getSegmentCount(snake) : 0;
  const spawn =
    snake?.alive && !snake.spectating && segCount > 0 && renderSegs > 0 ? "OK" : "FAIL";

  const head = resolveSnakeHead(snake ?? undefined);
  let camera: "OK" | "FAIL" = "FAIL";
  let visible: "YES" | "NO" = "NO";

  if (head && cellSize > 0) {
    const screenX = head.x * cellSize - camX;
    const screenY = head.y * cellSize - camY;
    const pad = cellSize * 2;
    const inView =
      screenX >= -pad &&
      screenX <= viewW + pad &&
      screenY >= -pad &&
      screenY <= viewH + pad;
    camera = inView ? "OK" : "FAIL";
    visible = spawn === "OK" && inView ? "YES" : "NO";
  }

  const sim =
    spawn === "OK" && !snake?.awaitingInput && tickAdvancing ? "OK" : "FAIL";

  return {
    spawn,
    camera,
    segments: renderSegs,
    visible,
    tick: world?.tick ?? 0,
    sim,
  };
}
