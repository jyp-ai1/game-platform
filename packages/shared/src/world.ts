/** Flagship world environment — biomes, zones, weather, day cycle, bosses. */

export type BiomeKind =
  | "forest"
  | "ice"
  | "lava"
  | "ocean"
  | "sky"
  | "space"
  | "city";

export type ZoneKind =
  | "safe"
  | "danger"
  | "boss"
  | "treasure"
  | "portal"
  | "fog";

export type WeatherKind =
  | "clear"
  | "rain"
  | "snow"
  | "meteor"
  | "storm"
  | "night"
  | "wind";

export type DayPhase = "morning" | "evening" | "night";

export type BossKind =
  | "dragon"
  | "kraken"
  | "titan_snake"
  | "meteor_worm"
  | "king_food";

export type WorldScaleTier =
  | "solo"
  | "duel"
  | "party"
  | "battle"
  | "festival"
  | "mega_world"
  | "world_event";

export interface WorldEnvironment {
  biomes: BiomeKind[];
  zones: ZoneKind[];
  weather: WeatherKind;
  dayPhase: DayPhase;
  scaleTier: WorldScaleTier;
  bossEnabled: boolean;
  activeBoss?: BossKind;
}

export const BOSS_LABELS: Record<BossKind, string> = {
  dragon: "Dragon",
  kraken: "Kraken",
  titan_snake: "Titan Snake",
  meteor_worm: "Meteor Worm",
  king_food: "King Food",
};

export const BIOME_LABELS: Record<BiomeKind, string> = {
  forest: "Forest",
  ice: "Ice",
  lava: "Lava",
  ocean: "Ocean",
  sky: "Sky",
  space: "Space",
  city: "City",
};
