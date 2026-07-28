/**
 * Sprint 14 — group-based difficulty scaling.
 * Games call getGroupDifficulty(slug, stageIndex) — framework handles the curve.
 */
import { getGameRuleGroup, type GameRuleGroup } from "./game-rule-groups";

export interface GroupDifficulty {
  stageIndex: number;
  speedMult: number;
  spawnMult: number;
  timeLimitSec: number | null;
  label: string;
}

const BASE: Record<GameRuleGroup, Omit<GroupDifficulty, "stageIndex" | "label">> = {
  puzzle: { speedMult: 1, spawnMult: 1, timeLimitSec: null },
  shooter: { speedMult: 1, spawnMult: 1, timeLimitSec: null },
  arcade: { speedMult: 1, spawnMult: 1, timeLimitSec: 180 },
  reaction: { speedMult: 1, spawnMult: 1, timeLimitSec: 60 },
  board: { speedMult: 1, spawnMult: 1, timeLimitSec: null },
  sports: { speedMult: 1, spawnMult: 1, timeLimitSec: 120 },
};

export function getGroupDifficulty(slug: string, stageIndex = 1): GroupDifficulty {
  const group = getGameRuleGroup(slug);
  const id = group?.id ?? "arcade";
  const base = BASE[id];
  const idx = Math.max(1, stageIndex);
  const step = idx - 1;

  switch (id) {
    case "puzzle":
      return {
        stageIndex: idx,
        speedMult: 1 + step * 0.06,
        spawnMult: 1 + step * 0.05,
        timeLimitSec: step >= 3 ? 120 - step * 10 : null,
        label: `Stage ${idx}`,
      };
    case "shooter":
      return {
        stageIndex: idx,
        speedMult: 1 + step * 0.1,
        spawnMult: 1 + step * 0.12,
        timeLimitSec: null,
        label: `Stage ${idx}`,
      };
    case "arcade":
      return {
        stageIndex: idx,
        speedMult: 1 + step * 0.08,
        spawnMult: 1 + step * 0.1,
        timeLimitSec: Math.max(60, (base.timeLimitSec ?? 180) - step * 15),
        label: `Stage ${idx}`,
      };
    case "reaction":
      return {
        stageIndex: idx,
        speedMult: 1 + step * 0.07,
        spawnMult: 1 - step * 0.04,
        timeLimitSec: Math.max(20, (base.timeLimitSec ?? 60) - step * 5),
        label: `Round ${idx}`,
      };
    case "board":
      return {
        stageIndex: idx,
        speedMult: 1 + step * 0.05,
        spawnMult: 1,
        timeLimitSec: null,
        label: `Match ${idx}`,
      };
    case "sports":
      return {
        stageIndex: idx,
        speedMult: 1 + step * 0.06,
        spawnMult: 1 + step * 0.05,
        timeLimitSec: Math.max(90, (base.timeLimitSec ?? 120) - step * 10),
        label: `Set ${idx}`,
      };
    default:
      return { stageIndex: idx, ...base, label: `Stage ${idx}` };
  }
}
