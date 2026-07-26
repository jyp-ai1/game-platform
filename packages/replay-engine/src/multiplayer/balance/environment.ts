/** World Environment — biomes, zones, weather, day cycle by player count. */
import type {
  BiomeKind,
  BossKind,
  DayPhase,
  WeatherKind,
  WorldEnvironment,
  WorldScaleTier,
  ZoneKind,
} from "@game-platform/shared";

import { resolveScaleTier } from "./dynamic-map";

const ALL_BIOMES: BiomeKind[] = ["forest", "ice", "lava", "ocean", "sky", "space", "city"];

function biomesForTier(tier: WorldScaleTier): BiomeKind[] {
  switch (tier) {
    case "solo":
    case "duel":
      return ["forest"];
    case "party":
      return ["forest", "ice"];
    case "battle":
      return ["forest", "ice", "lava", "ocean"];
    case "festival":
      return ["forest", "ice", "lava", "ocean"];
    case "mega_world":
      return ["forest", "ice", "lava", "ocean", "sky", "city"];
    case "world_event":
      return ALL_BIOMES;
    default:
      return ["forest"];
  }
}

function zonesForTier(tier: WorldScaleTier): ZoneKind[] {
  const base: ZoneKind[] = ["safe"];
  if (tier !== "solo") base.push("danger");
  if (tier === "party" || tier === "battle" || tier === "festival" || tier === "mega_world" || tier === "world_event") {
    base.push("boss", "treasure", "portal");
  }
  if (tier === "festival" || tier === "mega_world" || tier === "world_event") base.push("fog");
  return base;
}

function weatherForTier(tier: WorldScaleTier, tick = 0): WeatherKind {
  if (tier === "world_event") {
    const pool: WeatherKind[] = ["storm", "meteor", "rain", "wind"];
    return pool[tick % pool.length]!;
  }
  if (tier === "mega_world") return tick % 3 === 0 ? "storm" : "clear";
  if (tier === "festival") return tick % 4 === 0 ? "meteor" : "clear";
  return "clear";
}

function dayPhaseForTick(tick = 0): DayPhase {
  const cycle = tick % 900;
  if (cycle < 300) return "morning";
  if (cycle < 600) return "evening";
  return "night";
}

function bossForTier(tier: WorldScaleTier): BossKind | undefined {
  if (tier === "world_event") return "dragon";
  if (tier === "mega_world") return "kraken";
  if (tier === "festival") return "titan_snake";
  if (tier === "battle") return "meteor_worm";
  return undefined;
}

export function resolveEnvironment(playerCount: number, tick = 0): WorldEnvironment {
  const scaleTier = resolveScaleTier(playerCount);
  const activeBoss = bossForTier(scaleTier);
  return {
    biomes: biomesForTier(scaleTier),
    zones: zonesForTier(scaleTier),
    weather: weatherForTier(scaleTier, tick),
    dayPhase: dayPhaseForTick(tick),
    scaleTier,
    bossEnabled: !!activeBoss,
    activeBoss,
  };
}

export const EnvironmentEngine = { resolve: resolveEnvironment };
