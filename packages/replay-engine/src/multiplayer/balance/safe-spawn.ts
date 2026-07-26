/** Safe Spawn — min distance + invincibility window. */
import type { ComputedBalance } from "@game-platform/shared";

export interface SpawnCandidate {
  x: number;
  y: number;
}

export function findSafeSpawn(
  balance: ComputedBalance,
  worldSize: number,
  enemyPositions: SpawnCandidate[],
  isOccupied: (x: number, y: number) => boolean
): SpawnCandidate {
  const minDist = balance.safeSpawnMinDistance;
  for (let attempt = 0; attempt < 120; attempt++) {
    const x = Math.floor(Math.random() * (worldSize - 10)) + 5;
    const y = Math.floor(Math.random() * (worldSize - 10)) + 5;
    if (isOccupied(x, y)) continue;
    const tooClose = enemyPositions.some((e) => Math.hypot(e.x - x, e.y - y) < minDist);
    if (!tooClose) return { x, y };
  }
  return { x: Math.floor(worldSize / 2), y: Math.floor(worldSize / 2) };
}

export function isInvincible(invincibleUntil: number | undefined, now = Date.now()): boolean {
  return invincibleUntil != null && now < invincibleUntil;
}

export function grantInvincibility(balance: ComputedBalance, now = Date.now()): number {
  return now + balance.invincibilityMs;
}
