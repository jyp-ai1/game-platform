/** Dynamic Spawn Engine — food/items scale with player count. */
import type { ComputedBalance, SpawnPoint, FoodKind } from "@game-platform/shared";

export function computeSpawnBatch(balance: ComputedBalance, currentFood: number): number {
  const deficit = balance.foodCount - currentFood;
  if (deficit <= 0) return 0;
  return Math.min(Math.ceil(deficit * 0.15), 20);
}

export function rollSpawnPoints(
  balance: ComputedBalance,
  count: number,
  occupied: (x: number, y: number) => boolean
): SpawnPoint[] {
  const points: SpawnPoint[] = [];
  const w = balance.worldSize;
  for (let i = 0; i < count; i++) {
    let x = Math.floor(Math.random() * w);
    let y = Math.floor(Math.random() * w);
    let tries = 0;
    while (occupied(x, y) && tries < 80) {
      x = Math.floor(Math.random() * w);
      y = Math.floor(Math.random() * w);
      tries++;
    }
    points.push({ x, y, kind: "normal" });
  }
  return points;
}

export function rollBossSpawns(balance: ComputedBalance, center: { x: number; y: number }): SpawnPoint[] {
  if (!balance.bossEventsEnabled) return [];
  const kinds: FoodKind[] = ["golden_apple", "meteor", "black_hole"];
  return kinds.map((kind, i) => ({
    x: center.x + (i - 1) * 3,
    y: center.y,
    kind,
    value: kind === "golden_apple" ? 50 : kind === "meteor" ? 30 : 40,
  }));
}
