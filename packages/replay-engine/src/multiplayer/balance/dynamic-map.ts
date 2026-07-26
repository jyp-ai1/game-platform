/** Dynamic Map — absolute world sizes by player count (Flagship Snake). */
import type { MatchType } from "@game-platform/shared";

/** Official map breakpoints: 1P→100 … 20P→900 */
export const DYNAMIC_MAP = [
  { players: 1, worldSize: 100, foodMult: 1.0, respawnMult: 0.9, speedMult: 1.15 },
  { players: 2, worldSize: 180, foodMult: 1.5, respawnMult: 1.1, speedMult: 1.08 },
  { players: 3, worldSize: 260, foodMult: 2.0, respawnMult: 1.3, speedMult: 1.06 },
  { players: 5, worldSize: 350, foodMult: 2.8, respawnMult: 1.6, speedMult: 1.05 },
  { players: 10, worldSize: 550, foodMult: 4.5, respawnMult: 2.5, speedMult: 1.03 },
  { players: 20, worldSize: 900, foodMult: 8.0, respawnMult: 4.0, speedMult: 1.0 },
] as const;

type MapKey = "worldSize" | "foodMult" | "respawnMult" | "speedMult";

function interpolateMap(playerCount: number, key: MapKey): number {
  const count = Math.max(1, Math.min(20, playerCount));
  if (count <= DYNAMIC_MAP[0].players) return DYNAMIC_MAP[0][key];
  for (let i = 1; i < DYNAMIC_MAP.length; i++) {
    const prev = DYNAMIC_MAP[i - 1]!;
    const next = DYNAMIC_MAP[i]!;
    if (count <= next.players) {
      const t = (count - prev.players) / (next.players - prev.players);
      return prev[key] + t * (next[key] - prev[key]);
    }
  }
  return DYNAMIC_MAP[DYNAMIC_MAP.length - 1]![key];
}

export function resolveWorldSize(playerCount: number): number {
  return Math.round(interpolateMap(playerCount, "worldSize"));
}

/** Match type from player count + optional mode override. */
export function resolveMatchType(playerCount: number, mode?: string): MatchType {
  if (mode === "tournament") return "tournament";
  if (mode === "ranked") return "ranked";
  if (mode === "boss_raid") return "boss_raid";
  if (mode === "guild_war") return "guild_war";
  if (playerCount === 1) return "solo";
  if (playerCount === 2) return "duel";
  if (playerCount <= 4) return "party";
  if (playerCount >= 20) return "festival";
  if (playerCount >= 10) return "ranked";
  return "party";
}

export { interpolateMap };
