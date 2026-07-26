/** Match Size Profiles + Game Profile registry. */
import type { BalanceProfile, GameProfile, MatchSizeProfile } from "@game-platform/shared";

export const MATCH_SIZE_PROFILES: MatchSizeProfile[] = [
  { gameSlug: "snake", minPlayers: 2, maxPlayers: 20 },
  { gameSlug: "mini-golf", minPlayers: 2, maxPlayers: 8 },
  { gameSlug: "uno", minPlayers: 2, maxPlayers: 6 },
  { gameSlug: "bomber", minPlayers: 2, maxPlayers: 8 },
  { gameSlug: "drawing", minPlayers: 2, maxPlayers: 12 },
];

const gameProfiles = new Map<string, GameProfile>();
const balanceProfiles = new Map<string, BalanceProfile>();

export function registerGameProfile(profile: GameProfile): void {
  gameProfiles.set(profile.gameSlug, profile);
}

export function registerBalanceProfile(gameSlug: string, profile: BalanceProfile): void {
  balanceProfiles.set(gameSlug, profile);
}

export function getGameProfile(gameSlug: string): GameProfile | undefined {
  return gameProfiles.get(gameSlug);
}

export function getBalanceProfile(gameSlug: string): BalanceProfile | undefined {
  return balanceProfiles.get(gameSlug);
}

export function getMatchSizeProfile(gameSlug: string): MatchSizeProfile {
  return MATCH_SIZE_PROFILES.find((p) => p.gameSlug === gameSlug) ?? {
    gameSlug,
    minPlayers: 2,
    maxPlayers: 8,
  };
}

/** Bootstrap built-in profiles. */
export function initBalanceRegistry(): void {
  registerGameProfile({
    gameSlug: "snake",
    minPlayers: 2,
    maxPlayers: 20,
    recommendedPlayers: 8,
    worldScaling: true,
    dynamicDifficulty: true,
    safeSpawn: true,
    spectator: true,
    replayMoments: true,
    aiBalance: true,
    multiplayer: true,
    party: true,
    tournament: true,
    playModes: { solo: true, duo: true, party: true, tournament: true, spectator: true },
  });
  registerBalanceProfile("snake", {
    baseWorldSize: 100,
    baseFoodDensity: 200,
    baseRespawnMs: 3000,
    baseTickMs: 120,
    viewportCells: 80,
    safeSpawnMinDistance: 12,
    invincibilityMs: 3000,
    baseRewardRate: 1,
  });
}

initBalanceRegistry();
