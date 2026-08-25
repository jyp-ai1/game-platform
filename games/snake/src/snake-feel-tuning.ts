/** Snake Feel Final Polish — numbers only. No new systems. */

export const SNAKE_FEEL = {
  /** Path movement — float coords @ 20Hz, render @ 60fps (RC1 values in snake-mvp-rc1.ts) */
  baseSpeed: 1.0,
  boostSpeedMult: 1.2,
  segmentSpacing: 0.5,
  /** Sprint 14 — Slither-like: cap angular step per tick (immediate, small, fast). */
  maxTurnRadiansPerTick: 0.48,
  boostTurnMult: 0.82,
  /** @deprecated — use maxTurnRadiansPerTick */
  turnLerp: 0.3,
  headRadius: 0.38,
  bodyRadius: 0.3,
  tailRadius: 0.22,
  /** Slither-like pickup — food ~8px + head + ~7px margin (world units) */
  foodPickupRadius: 1.75,
  foodVisualRadiusPx: 8,
  collisionRadius: 0.32,
  /** Boost — speed up, tail drops food, min 3 segments */
  boostTailDropEvery: 4,
  boostMinSegments: 3,
  /** Boost — 5% zoom out via render scale (camera uses baseCellSize only) */
  boostFovScale: 0.95,
  /** Smooth boost zoom transition (no snap) */
  cameraZoomLerp: 0.12,
  boostMaxEnergy: 100,
  boostDrainPerTick: 2,
  boostRegenPerTick: 0.5,
  /** Food magnet — Slither-like pickup satisfaction */
  magnetRadius: 4.2,
  magnetRadiusBoost: 5.8,
  magnetPull: 0.32,
  magnetPullClose: 0.58,
  /** Camera — smooth lag follow; never snap or shake (Sprint 7.2: 0.08–0.10) */
  /** FIX-SNAKE-UX-001 Step1: damp follow so 20Hz head steps don't jitter the view. */
  cameraFollowLerp: 0.22,
  /** Base zoom-in — slight pull-back vs 1.4 so nearby enemies stay in frame */
  baseCameraZoom: 1.28,
  /** Slither-like viewport — cells visible on screen (not world-size scaled) */
  viewportCellsVisible: 56,
  minCellPx: 8,
  maxCellPx: 14,
  maxViewportPx: 720,
  /** Fallback step if time-based alpha unavailable; prefer tick-elapsed alpha in SnakeIo */
  segmentLerpStep: 0.34,
  headLerpStep: 0.55,
  /**
   * FIX-SNAKE-UX-002 — visual only (physics grid unchanged).
   * Grid lines amplify cell-step perception; keep opacity 0 (no visible grid).
   */
  visualGridSubdiv: 1,
  visualGridLineOpacity: 0,
  growthAnimMs: 150,
  eatPopAnimMs: 150,
  eatPopPeak: 1.08,
  growthThreshold: 2,
  tailWaveAmp: 0.12,
  tailWaveAmpBoost: 0.04,
  /** Juice — eat / kill feedback (camera never shakes) */
  deathShakeImpulse: 0,
  killShakeImpulse: 0,
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
  foodDensityMult: 2.0,
  bossHpMult: 0.85,
  bossDamagePerHit: 10,
  safeZoneRadiusMult: 1.12,
  eatValueMult: 1.12,
} as const;
