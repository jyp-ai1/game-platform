/** Adaptive World + Balance computation — scales by player count. */
import type { BalanceProfile, ComputedBalance, GameProfile } from "@game-platform/shared";

const BREAKPOINTS = [
  { players: 1, map: 1.0, food: 1.0, respawn: 1.0, speed: 1.0 },
  { players: 2, map: 1.5, food: 1.7, respawn: 1.2, speed: 1.0 },
  { players: 4, map: 2.2, food: 2.5, respawn: 1.8, speed: 1.05 },
  { players: 8, map: 3.5, food: 4.2, respawn: 3.0, speed: 1.1 },
  { players: 16, map: 5.0, food: 6.5, respawn: 5.0, speed: 1.12 },
  { players: 20, map: 7.0, food: 8.5, respawn: 6.5, speed: 1.15 },
  { players: 32, map: 9.0, food: 10.0, respawn: 8.0, speed: 1.2 },
] as const;

type ScaleKey = "map" | "food" | "respawn" | "speed";

function interpolate(playerCount: number, key: ScaleKey): number {
  const count = Math.max(1, playerCount);
  if (count <= BREAKPOINTS[0].players) return BREAKPOINTS[0][key];
  for (let i = 1; i < BREAKPOINTS.length; i++) {
    const prev = BREAKPOINTS[i - 1]!;
    const next = BREAKPOINTS[i]!;
    if (count <= next.players) {
      const t = (count - prev.players) / (next.players - prev.players);
      return prev[key] + t * (next[key] - prev[key]);
    }
  }
  return BREAKPOINTS[BREAKPOINTS.length - 1]![key];
}

/** Compute full balance from profile + live player count. */
export function computeBalance(
  profile: BalanceProfile,
  playerCount: number,
  gameProfile?: Pick<GameProfile, "worldScaling" | "dynamicDifficulty">
): ComputedBalance {
  const mapScale = gameProfile?.worldScaling === false ? 1 : interpolate(playerCount, "map");
  const foodScale = interpolate(playerCount, "food");
  const respawnScale = interpolate(playerCount, "respawn");
  const speedScale = interpolate(playerCount, "speed");

  const baseTick = profile.baseTickMs ?? 120;
  const worldSize = Math.round(profile.baseWorldSize * mapScale);
  const foodCount = Math.round(profile.baseFoodDensity * foodScale);
  const respawnMs = Math.max(800, Math.round(profile.baseRespawnMs / respawnScale));

  const cameraZoom = Math.max(0.35, Math.min(1, 1 / Math.sqrt(mapScale * 0.85)));
  const difficulty = gameProfile?.dynamicDifficulty === false ? 1 : 0.8 + playerCount * 0.02;

  return {
    playerCount,
    worldSize,
    foodCount,
    respawnMs,
    mapScale,
    foodScale,
    respawnScale,
    physicsTickMs: Math.round(baseTick / speedScale),
    networkTickMs: Math.max(80, Math.round(baseTick * 0.9)),
    spawnTickMs: Math.max(500, Math.round(2000 / foodScale)),
    saveTickMs: 5000,
    cameraZoom,
    safeSpawnMinDistance: profile.safeSpawnMinDistance ?? Math.max(8, Math.floor(worldSize * 0.04)),
    invincibilityMs: profile.invincibilityMs ?? 3000,
    difficulty,
    rewardRate: (profile.baseRewardRate ?? 1) * (1 + playerCount * 0.005),
    enemyDensity: Math.min(1, playerCount / 20),
    bossEventsEnabled: playerCount >= 20,
    features: [],
    viewportCells: profile.viewportCells ?? 80,
  };
}

export { BREAKPOINTS };
