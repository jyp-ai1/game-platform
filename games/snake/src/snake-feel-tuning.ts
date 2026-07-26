/** Snake Feel Final Polish — numbers only. No new systems. */

export const SNAKE_FEEL = {
  /** Boost — early access, punchy speed without drain frustration */
  boostSteps: 2,
  boostMinScore: 3,
  boostCostPerTick: 1,
  /** Food magnet — Slither-like pickup satisfaction */
  magnetRadius: 3.4,
  magnetRadiusBoost: 5.2,
  /** Camera — snappy follow, subtle boost zoom */
  cameraFollowLerp: 0.34,
  cameraBoostZoom: 1.1,
  /** Visual motion smoothness */
  segmentLerpStep: 0.38,
  /** Juice — eat / kill / death feedback */
  deathShakeImpulse: 16,
  killShakeImpulse: 11,
  eatParticleCount: 16,
  deathParticleCount: 40,
  mobileSwipeThreshold: 14,
  /** Audio frequencies (Hz) */
  eatSoundBaseHz: 660,
  goldenEatHz: 980,
  boostSoundHz: 210,
  killSoundHz: 540,
} as const;

/** World / spawn polish — density & growth pacing */
export const SNAKE_POLISH = {
  foodDensityMult: 1.14,
  bossHpMult: 0.85,
  bossDamagePerHit: 10,
  safeZoneRadiusMult: 1.12,
  eatValueMult: 1.12,
} as const;
