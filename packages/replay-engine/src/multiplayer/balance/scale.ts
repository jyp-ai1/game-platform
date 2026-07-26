/** Runtime Scaling — tick rates from balance. */
import type { ComputedBalance } from "@game-platform/shared";

export interface RuntimeTicks {
  physics: number;
  network: number;
  spawn: number;
  save: number;
}

export function computeRuntimeTicks(balance: ComputedBalance): RuntimeTicks {
  return {
    physics: balance.physicsTickMs,
    network: balance.networkTickMs,
    spawn: balance.spawnTickMs,
    save: balance.saveTickMs,
  };
}

export function scaleDifficulty(baseSpeed: number, balance: ComputedBalance): number {
  return baseSpeed * balance.difficulty;
}
