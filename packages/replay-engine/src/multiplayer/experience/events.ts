/** Dynamic World Events — unpredictable fun driver. */
import type { WorldEvent, WorldEventKind } from "@game-platform/shared";

let eventCounter = 0;

const EVENT_CONFIG: Record<
  WorldEventKind,
  { durationMs: number; radius: number; minPlayers: number }
> = {
  golden_apple: { durationMs: 25_000, radius: 2, minPlayers: 4 },
  meteor_shower: { durationMs: 18_000, radius: 8, minPlayers: 4 },
  black_hole: { durationMs: 15_000, radius: 5, minPlayers: 8 },
  boss_snake: { durationMs: 45_000, radius: 6, minPlayers: 8 },
  treasure_chest: { durationMs: 20_000, radius: 2, minPlayers: 2 },
};

export function rollWorldEvent(
  playerCount: number,
  worldSize: number,
  tick: number,
  existing: WorldEvent[]
): WorldEvent | null {
  if (existing.some((e) => Date.now() < e.expiresAt)) return null;
  if (tick % 120 !== 0 || Math.random() > 0.35) return null;

  const eligible = (Object.keys(EVENT_CONFIG) as WorldEventKind[]).filter(
    (k) => playerCount >= EVENT_CONFIG[k].minPlayers
  );
  if (!eligible.length) return null;

  const kind = eligible[Math.floor(Math.random() * eligible.length)]!;
  const cfg = EVENT_CONFIG[kind];
  const now = Date.now();
  return {
    id: `evt-${++eventCounter}`,
    kind,
    x: Math.floor(Math.random() * (worldSize - 20)) + 10,
    y: Math.floor(Math.random() * (worldSize - 20)) + 10,
    radius: cfg.radius,
    startedAt: now,
    expiresAt: now + cfg.durationMs,
    announced: true,
    metadata: {
      xpMultiplier: kind === "golden_apple" ? 5 : 1,
      coinMultiplier: kind === "golden_apple" ? 5 : 1,
      globalPing: kind === "golden_apple",
    },
  };
}

export function expireEvents(events: WorldEvent[]): WorldEvent[] {
  const now = Date.now();
  return events.filter((e) => e.expiresAt > now);
}

export function eventLabel(kind: WorldEventKind): string {
  const labels: Record<WorldEventKind, string> = {
    golden_apple: "Golden Apple — XP×5 · Coin×5",
    meteor_shower: "Meteor Shower — 회피 + 보상",
    black_hole: "Black Hole — 위험 + 대보상",
    boss_snake: "Boss Snake — 협동 처치",
    treasure_chest: "Treasure Chest — 랜덤 버프",
  };
  return labels[kind];
}
