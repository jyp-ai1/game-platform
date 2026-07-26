/** Universal Multiplayer Balance — shared types. */
import type { PlayModes } from "./social";
import type { WorldEnvironment } from "./world";

export interface GameProfile {
  gameSlug: string;
  minPlayers: number;
  maxPlayers: number;
  recommendedPlayers: number;
  worldScaling: boolean;
  dynamicDifficulty: boolean;
  safeSpawn: boolean;
  spectator: boolean;
  replayMoments: boolean;
  aiBalance: boolean;
  /** Per-game play mode flags — home auto-surfaces solo/friends/party/tournament. */
  playModes: PlayModes;
  /** Creator metadata — platform auto-attaches multiplayer features. */
  multiplayer?: boolean;
  party?: boolean;
  tournament?: boolean;
}

/** Per-game balance.ts profile — games define this only. */
export interface BalanceProfile {
  baseWorldSize: number;
  baseFoodDensity: number;
  baseRespawnMs: number;
  baseTickMs?: number;
  baseRewardRate?: number;
  viewportCells?: number;
  safeSpawnMinDistance?: number;
  invincibilityMs?: number;
}

export type MatchType =
  | "solo"
  | "duel"
  | "party"
  | "ranked"
  | "tournament"
  | "festival"
  | "boss_raid"
  | "guild_war";

export interface ComputedBalance {
  playerCount: number;
  worldSize: number;
  foodCount: number;
  respawnMs: number;
  mapScale: number;
  foodScale: number;
  respawnScale: number;
  physicsTickMs: number;
  networkTickMs: number;
  spawnTickMs: number;
  saveTickMs: number;
  cameraZoom: number;
  safeSpawnMinDistance: number;
  invincibilityMs: number;
  /** Spawn Shield duration — anti spawn-kill. */
  spawnShieldMs: number;
  /** Safe zone radius around spawn points. */
  safeZoneRadius: number;
  antiCampEnabled: boolean;
  matchType: MatchType;
  difficulty: number;
  rewardRate: number;
  enemyDensity: number;
  bossEventsEnabled: boolean;
  dynamicEventsEnabled: boolean;
  spectatorEnabled: boolean;
  environment: WorldEnvironment;
  features: WorldFeature[];
  viewportCells: number;
}

export type WorldFeatureType =
  | "river"
  | "wall"
  | "portal"
  | "biome"
  | "boss_zone"
  | "safe_zone"
  | "danger_zone"
  | "treasure_zone"
  | "fog_zone"
  | "portal_zone";

export interface WorldFeature {
  type: WorldFeatureType;
  x: number;
  y: number;
  w?: number;
  h?: number;
  label?: string;
}

export type FoodKind = "normal" | "golden_apple" | "meteor" | "black_hole";

export interface SpawnPoint {
  x: number;
  y: number;
  kind: FoodKind | "item" | "buff" | "trap" | "npc";
  value?: number;
}

export interface DeathEvent {
  deviceId: string;
  x: number;
  y: number;
  tick: number;
  cause: "wall" | "self" | "player" | "boss";
}

export interface MatchAnalyticsSnapshot {
  roomCode: string;
  gameSlug: string;
  playerCount: number;
  avgPlayTimeMs: number;
  deaths: DeathEvent[];
  respawnCount: number;
  foodShortageTicks: number;
  congestionScore: number;
  killDistribution: Record<string, number>;
  churnCount: number;
  recordedAt: string;
}

export interface HeatmapCell {
  x: number;
  y: number;
  deaths: number;
  congestion: number;
  foodGap: number;
}

export interface AiBalanceRecommendation {
  mapExpandPercent: number;
  foodIncreasePercent: number;
  respawnReduceMs: number;
  rewardIncreasePercent: number;
  reason: string;
  confidence: number;
}

export interface MatchSizeProfile {
  gameSlug: string;
  minPlayers: number;
  maxPlayers: number;
}
