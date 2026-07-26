/**
 * Universal Multiplayer Balance Engine — Replay OS L2
 */
import type { BalanceProfile, ComputedBalance, GameProfile } from "@game-platform/shared";

import { recommendBalance } from "./ai-balance";
import {
  flushMatchAnalytics,
  getMatchAnalyticsHistory,
  recordChurn,
  recordDeath,
  recordFoodShortage,
  recordKill,
  recordRespawn,
  startMatchAnalytics,
} from "./analytics";
import { computeBalance } from "./compute";
import { buildHeatmap, summarizeHeatmap } from "./heatmap";
import {
  getBalanceProfile,
  getGameProfile,
  getMatchSizeProfile,
  registerBalanceProfile,
  registerGameProfile,
  MATCH_SIZE_PROFILES,
} from "./registry";
import { computeRuntimeTicks } from "./scale";
import { computeSpawnBatch, rollBossSpawns, rollSpawnPoints } from "./spawn";
import { findSafeSpawn, grantInvincibility, isInvincible, recordDeathZone } from "./safe-spawn";
import { generateWorldFeatures, isBlockedByFeature } from "./world";

export function balanceFor(gameSlug: string, playerCount: number): ComputedBalance {
  const bp = getBalanceProfile(gameSlug);
  const gp = getGameProfile(gameSlug);
  if (!bp) {
    return computeBalance(
      { baseWorldSize: 80, baseFoodDensity: 40, baseRespawnMs: 2000 },
      playerCount
    );
  }
  const computed = computeBalance(bp, playerCount, gp);
  computed.features = generateWorldFeatures(computed);
  return computed;
}

export const BalanceEngine = {
  compute: balanceFor,
  profile: getGameProfile,
  balanceProfile: getBalanceProfile,
  matchSize: getMatchSizeProfile,
  registerGame: registerGameProfile,
  registerBalance: registerBalanceProfile,
  profiles: MATCH_SIZE_PROFILES,
  spawn: { batch: computeSpawnBatch, roll: rollSpawnPoints, boss: rollBossSpawns },
  scale: computeRuntimeTicks,
  world: { features: generateWorldFeatures, blocked: isBlockedByFeature },
  safeSpawn: { find: findSafeSpawn, invincible: isInvincible, grant: grantInvincibility, recordDeath: recordDeathZone },
  analytics: {
    start: startMatchAnalytics,
    death: recordDeath,
    kill: recordKill,
    respawn: recordRespawn,
    foodShortage: recordFoodShortage,
    churn: recordChurn,
    flush: flushMatchAnalytics,
    history: getMatchAnalyticsHistory,
  },
  heatmap: { build: buildHeatmap, summarize: summarizeHeatmap },
  ai: { recommend: recommendBalance },
};

export {
  computeBalance,
  computeSpawnBatch,
  rollSpawnPoints,
  rollBossSpawns,
  computeRuntimeTicks,
  generateWorldFeatures,
  isBlockedByFeature,
  findSafeSpawn,
  isInvincible,
  grantInvincibility,
  recordDeathZone,
  startMatchAnalytics,
  recordDeath,
  flushMatchAnalytics,
  getMatchAnalyticsHistory,
  buildHeatmap,
  recommendBalance,
  registerGameProfile,
  registerBalanceProfile,
  getGameProfile,
  getBalanceProfile,
  getMatchSizeProfile,
  MATCH_SIZE_PROFILES,
};

export type { BalanceProfile, ComputedBalance, GameProfile };
