/** Snake — Universal Game Profile */
import type { GameProfile } from "@game-platform/shared";

const snakeGameProfile: GameProfile = {
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
  playModes: {
    solo: true,
    duo: true,
    party: true,
    tournament: true,
    spectator: true,
  },
};

export default snakeGameProfile;
