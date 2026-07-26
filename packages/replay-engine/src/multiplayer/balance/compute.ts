/** Adaptive World + Balance — Dynamic Map absolute sizes + spawn safety. */
import type { BalanceProfile, ComputedBalance, GameProfile, MatchType } from "@game-platform/shared";

import { interpolateMap, resolveMatchType, resolveWorldSize } from "./dynamic-map";
import { resolveEnvironment } from "./environment";

/** Compute full balance — world size from DYNAMIC_MAP, never hardcoded in games. */
export function computeBalance(
  profile: BalanceProfile,
  playerCount: number,
  gameProfile?: Pick<GameProfile, "worldScaling" | "dynamicDifficulty">,
  mode?: string
): ComputedBalance {
  const count = Math.max(1, Math.min(100, playerCount));
  const useAbsolute = gameProfile?.worldScaling !== false;

  const worldSize = useAbsolute
    ? resolveWorldSize(count)
    : Math.round(profile.baseWorldSize * (count <= 1 ? 1 : count / 2));

  const foodMult = interpolateMap(count, "foodMult");
  const respawnMult = interpolateMap(count, "respawnMult");
  const speedMult = interpolateMap(count, "speedMult");

  const foodCount = Math.round(profile.baseFoodDensity * foodMult);
  const respawnMs = Math.max(800, Math.round(profile.baseRespawnMs / respawnMult));
  const baseTick = profile.baseTickMs ?? 120;

  const mapScale = worldSize / profile.baseWorldSize;
  const cameraZoom = Math.max(0.28, Math.min(1, 100 / worldSize));
  const matchType = resolveMatchType(count, mode);
  const spawnShieldMs = Math.max(3000, 2000 + count * 100);
  const safeZoneRadius = Math.max(6, Math.floor(worldSize * 0.06));
  const safeSpawnMinDistance = profile.safeSpawnMinDistance ?? Math.max(12, Math.floor(worldSize * 0.08));

  return {
    playerCount: count,
    worldSize,
    foodCount,
    respawnMs,
    mapScale,
    foodScale: foodMult,
    respawnScale: respawnMult,
    physicsTickMs: Math.round(baseTick / speedMult),
    networkTickMs: Math.max(80, Math.round(baseTick * 0.9)),
    spawnTickMs: Math.max(400, Math.round(1800 / foodMult)),
    saveTickMs: 5000,
    cameraZoom,
    safeSpawnMinDistance,
    invincibilityMs: profile.invincibilityMs ?? spawnShieldMs,
    spawnShieldMs,
    safeZoneRadius,
    antiCampEnabled: count >= 2,
    matchType,
    difficulty: gameProfile?.dynamicDifficulty === false ? 1 : 0.8 + count * 0.02,
    rewardRate: (profile.baseRewardRate ?? 1) * (1 + count * 0.005),
    enemyDensity: Math.min(1, count / 20),
    bossEventsEnabled: count >= 4,
    dynamicEventsEnabled: count >= 4,
    spectatorEnabled: count >= 2,
    environment: resolveEnvironment(count),
    features: [],
    viewportCells: profile.viewportCells ?? Math.min(100, Math.max(60, Math.floor(8000 / worldSize))),
  };
}

export { DYNAMIC_MAP } from "./dynamic-map";
