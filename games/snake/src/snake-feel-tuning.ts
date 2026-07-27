/** Snake Feel Final Polish — numbers only. No new systems. */

export const SNAKE_FEEL = {
  /** Path movement — float coords @ 20Hz, render @ 60fps */
  baseSpeed: 4.2,
  boostSpeedMult: 1.55,
  segmentSpacing: 0.42,
  turnLerp: 0.2,
  headRadius: 0.38,
  bodyRadius: 0.3,
  tailRadius: 0.22,
  foodPickupRadius: 0.55,
  collisionRadius: 0.32,
  /** Boost — speed up, tail drops food, min 3 segments */
  boostTailDropEvery: 4,
  boostMinSegments: 3,
  boostFovScale: 0.95,
  boostMaxEnergy: 100,
  boostDrainPerTick: 2,
  boostRegenPerTick: 0.5,
  /** Food magnet — Slither-like pickup satisfaction */
  magnetRadius: 3.4,
  magnetRadiusBoost: 5.2,
  /** Camera — smooth lag follow only; no boost zoom/shake */
  cameraFollowLerp: 0.1,
  /** Slither-like viewport — cells visible on screen (not world-size scaled) */
  viewportCellsVisible: 50,
  minCellPx: 8,
  maxCellPx: 14,
  maxViewportPx: 720,
  /** Visual motion smoothness */
  segmentLerpStep: 0.32,
  headLerpStep: 0.48,
  growthAnimMs: 150,
  growthThreshold: 2,
  tailWaveAmp: 0.12,
  tailWaveAmpBoost: 0.04,
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
  rareFoodHz: 1040,
  rankUpHz: 880,
} as const;

/** World / spawn polish — density & growth pacing */
export const SNAKE_POLISH = {
  foodDensityMult: 1.14,
  bossHpMult: 0.85,
  bossDamagePerHit: 10,
  safeZoneRadiusMult: 1.12,
  eatValueMult: 1.12,
} as const;
