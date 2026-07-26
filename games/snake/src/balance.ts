/** Snake — Universal Balance Profile (balance.ts) */
import type { BalanceProfile } from "@game-platform/shared";

const snakeBalance: BalanceProfile = {
  baseWorldSize: 100,
  baseFoodDensity: 200,
  baseRespawnMs: 3000,
  baseTickMs: 120,
  viewportCells: 80,
  safeSpawnMinDistance: 12,
  invincibilityMs: 3000,
  baseRewardRate: 1,
};

export default snakeBalance;
