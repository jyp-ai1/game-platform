/** Safe Spawn — Safe Zone · Spawn Shield · Anti Camp */
import type { ComputedBalance } from "@game-platform/shared";

export interface SpawnCandidate {
  x: number;
  y: number;
}

export interface DeathZone {
  x: number;
  y: number;
  at: number;
}

const CAMP_TTL_MS = 30_000;

/** Find spawn avoiding enemies, death zones (anti-camp), and safe zone violations. */
export function findSafeSpawn(
  balance: ComputedBalance,
  worldSize: number,
  enemyPositions: SpawnCandidate[],
  isOccupied: (x: number, y: number) => boolean,
  deathZones: DeathZone[] = []
): SpawnCandidate {
  const minDist = balance.safeSpawnMinDistance;
  const campRadius = balance.antiCampEnabled ? Math.max(8, balance.safeZoneRadius) : 0;
  const now = Date.now();
  const recentDeaths = deathZones.filter((d) => now - d.at < CAMP_TTL_MS);

  for (let attempt = 0; attempt < 150; attempt++) {
    const margin = balance.safeZoneRadius;
    const x = Math.floor(Math.random() * (worldSize - margin * 2)) + margin;
    const y = Math.floor(Math.random() * (worldSize - margin * 2)) + margin;
    if (isOccupied(x, y)) continue;

    const tooCloseEnemy = enemyPositions.some((e) => Math.hypot(e.x - x, e.y - y) < minDist);
    if (tooCloseEnemy) continue;

    const inCampZone = recentDeaths.some((d) => Math.hypot(d.x - x, d.y - y) < campRadius);
    if (inCampZone) continue;

    return { x, y };
  }
  return { x: Math.floor(worldSize / 2), y: Math.floor(worldSize / 2) };
}

export function isInvincible(invincibleUntil: number | undefined, now = Date.now()): boolean {
  return invincibleUntil != null && now < invincibleUntil;
}

/** Grant Spawn Shield — extended invincibility on spawn/respawn. */
export function grantInvincibility(balance: ComputedBalance, now = Date.now()): number {
  return now + balance.spawnShieldMs;
}

export function recordDeathZone(zones: DeathZone[], x: number, y: number, now = Date.now()): DeathZone[] {
  return [...zones.filter((z) => now - z.at < CAMP_TTL_MS), { x, y, at: now }].slice(-40);
}
