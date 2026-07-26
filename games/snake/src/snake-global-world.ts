/** Living Global World — persistence, cluster, display rankings */
import type { SnakeIoWorld } from "./snake-io-engine";
import { isBotSnake } from "./snake-ai-fill";

const PERSIST_PREFIX = "play29:gw-state:";
const PERSIST_MAX_AGE_MS = 2 * 60 * 60 * 1000;

export interface GlobalWorldJoinBrief {
  population: number;
  topName: string;
  topScore: number;
  eventHint: string | null;
  tick: number;
}

export function persistGlobalWorldState(roomCode: string, world: SnakeIoWorld): void {
  if (typeof window === "undefined" || world.tick % 20 !== 0) return;
  try {
    localStorage.setItem(
      PERSIST_PREFIX + roomCode.toUpperCase(),
      JSON.stringify({ savedAt: Date.now(), world })
    );
  } catch { /* quota */ }
}

export function loadPersistedGlobalWorld(roomCode: string): SnakeIoWorld | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PERSIST_PREFIX + roomCode.toUpperCase());
    if (!raw) return null;
    const { savedAt, world } = JSON.parse(raw) as { savedAt: number; world: SnakeIoWorld };
    if (Date.now() - savedAt > PERSIST_MAX_AGE_MS) return null;
    return world;
  } catch {
    return null;
  }
}

/** TOP10 — humans first, bots fill remaining slots */
export function getDisplayRankings(
  world: SnakeIoWorld,
  limit = 10
): { deviceId: string; nickname: string; score: number; isBot: boolean }[] {
  const entries = world.rankings.map((r) => ({
    ...r,
    isBot: isBotSnake(world.snakes[r.deviceId]),
  }));
  const humans = entries.filter((e) => !e.isBot);
  const bots = entries.filter((e) => e.isBot);
  return [...humans, ...bots].slice(0, limit);
}

export function buildJoinBrief(world: SnakeIoWorld): GlobalWorldJoinBrief {
  const top = getDisplayRankings(world, 1)[0];
  const ann = world.living?.announcements[0];
  return {
    population: Object.keys(world.snakes).length,
    topName: top?.nickname ?? "—",
    topScore: top?.score ?? 0,
    eventHint: ann?.message ?? world.events[0]?.kind ?? null,
    tick: world.tick,
  };
}

/** Seed a fresh world so it doesn't feel like tick 0 */
export function warmGlobalWorld(world: SnakeIoWorld): void {
  world.tick = 80 + Math.floor(Math.random() * 120);
  for (const snake of Object.values(world.snakes)) {
    if (!snake.isBot) continue;
    snake.score = 15 + Math.floor(Math.random() * 280);
    snake.aliveSinceTick = world.tick - Math.floor(Math.random() * 60);
    snake.totalKills = Math.floor(Math.random() * 4);
  }
}

export const GlobalWorldPersist = {
  save: persistGlobalWorldState,
  load: loadPersistedGlobalWorld,
  displayRankings: getDisplayRankings,
  joinBrief: buildJoinBrief,
  warm: warmGlobalWorld,
};
