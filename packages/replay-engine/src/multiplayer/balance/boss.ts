/** Boss Engine — cooperative boss encounters with party-wide rewards. */
import type { BossKind } from "@game-platform/shared";
import { BOSS_LABELS } from "@game-platform/shared";

export interface BossEncounter {
  kind: BossKind;
  label: string;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  rewardXp: number;
  rewardCoin: number;
  defeated: boolean;
}

const BOSS_STATS: Record<BossKind, { hp: number; xp: number; coin: number }> = {
  dragon: { hp: 500, xp: 200, coin: 100 },
  kraken: { hp: 400, xp: 150, coin: 80 },
  titan_snake: { hp: 350, xp: 120, coin: 60 },
  meteor_worm: { hp: 250, xp: 80, coin: 40 },
  king_food: { hp: 200, xp: 60, coin: 30 },
};

export function spawnBoss(kind: BossKind, worldSize: number): BossEncounter {
  const stats = BOSS_STATS[kind];
  return {
    kind,
    label: BOSS_LABELS[kind],
    hp: stats.hp,
    maxHp: stats.hp,
    x: Math.floor(worldSize / 2),
    y: Math.floor(worldSize / 2),
    rewardXp: stats.xp,
    rewardCoin: stats.coin,
    defeated: false,
  };
}

export function damageBoss(boss: BossEncounter, amount: number): BossEncounter {
  const hp = Math.max(0, boss.hp - amount);
  return { ...boss, hp, defeated: hp <= 0 };
}

export function bossPartyReward(boss: BossEncounter, playerCount: number): { xp: number; coin: number } {
  if (!boss.defeated) return { xp: 0, coin: 0 };
  return {
    xp: boss.rewardXp * playerCount,
    coin: boss.rewardCoin * playerCount,
  };
}

export const BossEngine = {
  spawn: spawnBoss,
  damage: damageBoss,
  reward: bossPartyReward,
  labels: BOSS_LABELS,
  stats: BOSS_STATS,
};
