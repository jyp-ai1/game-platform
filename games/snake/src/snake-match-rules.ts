/** Dynamic Match Rules — 2 / 8 / 20 player feel (numbers only) */

export type SnakeMatchRule =
  | "duel"
  | "team_duel"
  | "boss_battle"
  | "dynamic_event"
  | "survival"
  | "festival";

export interface MatchRuleConfig {
  rule: SnakeMatchRule;
  label: string;
  description: string;
  bossEnabled: boolean;
  eventsEnabled: boolean;
  collapseEnabled: boolean;
  safeZoneDrift: boolean;
  respawnEnabled: boolean;
  foodDensityMult: number;
  boostCostMult: number;
  startingSegments: number;
  cameraZoomMult: number;
  safeZoneRadiusMult: number;
  scoreTarget: number;
}

export function resolveSnakeMatchRule(playerCount: number): MatchRuleConfig {
  if (playerCount >= 50) return resolveGlobalWorldRule();
  if (playerCount <= 2) {
    return {
      rule: "duel",
      label: "Duel",
      description: "1 life · 좁은 맵 · 직접 대결",
      bossEnabled: false,
      eventsEnabled: false,
      collapseEnabled: false,
      safeZoneDrift: false,
      respawnEnabled: false,
      foodDensityMult: 0.88,
      boostCostMult: 0.55,
      startingSegments: 5,
      cameraZoomMult: 1.22,
      safeZoneRadiusMult: 0,
      scoreTarget: 180,
    };
  }
  if (playerCount <= 4) {
    return {
      rule: "team_duel",
      label: "Team Duel",
      description: "팀 대결 · Safe Zone 이동",
      bossEnabled: false,
      eventsEnabled: true,
      collapseEnabled: false,
      safeZoneDrift: true,
      respawnEnabled: true,
      foodDensityMult: 0.92,
      boostCostMult: 0.72,
      startingSegments: 4,
      cameraZoomMult: 1.1,
      safeZoneRadiusMult: 1,
      scoreTarget: 320,
    };
  }
  if (playerCount <= 7) {
    return {
      rule: "boss_battle",
      label: "Boss Battle",
      description: "보스 등장 · 협력 PvE",
      bossEnabled: true,
      eventsEnabled: true,
      collapseEnabled: false,
      safeZoneDrift: true,
      respawnEnabled: true,
      foodDensityMult: 1.05,
      boostCostMult: 0.78,
      startingSegments: 3,
      cameraZoomMult: 1.02,
      safeZoneRadiusMult: 1.1,
      scoreTarget: 480,
    };
  }
  if (playerCount <= 11) {
    return {
      rule: "dynamic_event",
      label: "Dynamic Event",
      description: "8인 최적 · Golden Snake",
      bossEnabled: true,
      eventsEnabled: true,
      collapseEnabled: false,
      safeZoneDrift: true,
      respawnEnabled: true,
      foodDensityMult: 1.22,
      boostCostMult: 0.82,
      startingSegments: 3,
      cameraZoomMult: 1,
      safeZoneRadiusMult: 1,
      scoreTarget: 550,
    };
  }
  if (playerCount <= 15) {
    return {
      rule: "survival",
      label: "Survival",
      description: "맵 축소 · 마지막 생존",
      bossEnabled: true,
      eventsEnabled: true,
      collapseEnabled: true,
      safeZoneDrift: true,
      respawnEnabled: true,
      foodDensityMult: 1,
      boostCostMult: 0.92,
      startingSegments: 3,
      cameraZoomMult: 0.96,
      safeZoneRadiusMult: 0.92,
      scoreTarget: 750,
    };
  }
  return {
    rule: "festival",
    label: "Festival Mode",
    description: "20인 · Food Storm · Boss",
    bossEnabled: true,
    eventsEnabled: true,
    collapseEnabled: true,
    safeZoneDrift: true,
    respawnEnabled: true,
    foodDensityMult: 1.32,
    boostCostMult: 0.78,
    startingSegments: 3,
    cameraZoomMult: 0.94,
    safeZoneRadiusMult: 1.15,
    scoreTarget: 900,
  };
}

/** 50-player Global World — max festival scale */
export function resolveGlobalWorldRule(): MatchRuleConfig {
  return {
    rule: "festival",
    label: "Global World",
    description: "50인 LIVE · World Events · AI Fill",
    bossEnabled: true,
    eventsEnabled: true,
    collapseEnabled: true,
    safeZoneDrift: true,
    respawnEnabled: false,
    foodDensityMult: 1.38,
    boostCostMult: 0.75,
    startingSegments: 10,
    cameraZoomMult: 0.9,
    safeZoneRadiusMult: 1.2,
    scoreTarget: 1200,
  };
}
