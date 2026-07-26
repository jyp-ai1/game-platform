/** Flagship Experience — shared types for events, teams, objectives, etc. */

export type WorldEventKind =
  | "golden_apple"
  | "meteor_shower"
  | "black_hole"
  | "boss_snake"
  | "treasure_chest"
  | "double_exp"
  | "food_storm"
  | "portal_open"
  | "boss_spawn"
  | "team_battle"
  | "survival"
  | "treasure_rain";

export interface WorldEvent {
  id: string;
  kind: WorldEventKind;
  x: number;
  y: number;
  radius: number;
  startedAt: number;
  expiresAt: number;
  announced: boolean;
  metadata?: Record<string, unknown>;
}

export type PowerUpKind =
  | "speed"
  | "shield"
  | "magnet"
  | "double_score"
  | "ghost"
  | "freeze"
  | "teleport";

export interface ActivePowerUp {
  kind: PowerUpKind;
  expiresAt: number;
}

export type MatchObjectiveKind =
  | "score_race"
  | "food_race"
  | "golden_apple"
  | "boss_kill"
  | "survive_time"
  | "overtake_friend"
  | "flag_capture";

export interface MatchObjective {
  kind: MatchObjectiveKind;
  target: number;
  progress: Record<string, number>;
  winnerId?: string;
  label: string;
}

export type TeamMode = "ffa" | "1v1" | "2v2" | "3v3" | "5v5" | "party" | "guild";

export interface Team {
  id: string;
  name: string;
  mode: TeamMode;
  memberIds: string[];
  score: number;
}

export type SeasonTheme =
  | "spring"
  | "summer"
  | "halloween"
  | "christmas"
  | "lunar_new_year"
  | "rain"
  | "night"
  | "volcano";

export type MomentKind =
  | "triple_kill"
  | "near_death"
  | "longest_escape"
  | "boss_slayer"
  | "comeback"
  | "top10_entry"
  | "first_kill"
  | "giant_slayer"
  | "revenge"
  | "survival_5min";

export interface ReplayMoment {
  id: string;
  kind: MomentKind;
  deviceId: string;
  nickname: string;
  tick: number;
  createdAt: string;
  meta?: Record<string, unknown>;
}

export type SpectatorMode = "friend" | "top1" | "free" | "replay" | "slowmo";

export interface DirectorAdjustment {
  mapExpandPercent: number;
  foodBoostPercent: number;
  rewardBoostPercent: number;
  respawnReduceMs: number;
  reason: string;
}

export interface ProgressionStage {
  id: number;
  name: string;
  theme: string;
  minScore: number;
}

export interface UxTier {
  minPlayers: number;
  label: string;
  features: string[];
  minimap: boolean;
  events: boolean;
  spectator: boolean;
  aiDirector: boolean;
}

export interface TournamentSlot {
  id: string;
  startsAt: string;
  maxPlayers: number;
  enrolled: number;
  status: "open" | "live" | "finished";
}

export interface CertificationResult {
  gameSlug: string;
  passed: boolean;
  score: number;
  checks: { id: string; label: string; pass: boolean }[];
}
