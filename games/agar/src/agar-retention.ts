/**
 * GAME-DEV-008 — missions, combo helpers, localStorage best records.
 * Agar-only retention layer (no platform / Supabase).
 */
import type { AgarAiDifficulty } from "./agar-io-engine";

export type AgarMissionId =
  | "hunter"
  | "virus_survivor"
  | "eject_master"
  | "split_attack"
  | "top3";

export type AgarMissionDef = {
  id: AgarMissionId;
  emoji: string;
  label: string;
  target: number;
};

export type AgarMissionProgress = AgarMissionDef & {
  current: number;
  done: boolean;
};

export type AgarSessionStats = {
  botsEaten: number;
  virusEscapes: number;
  ejectCount: number;
  splitKills: number;
  peakRank: number;
  peakMass: number;
  bestCombo: number;
  missionsComplete: AgarMissionId[];
};

export type AgarRunSummary = AgarSessionStats & {
  finalRank: number;
  finalMass: number;
  difficulty: AgarAiDifficulty;
};

export type AgarBestRecord = {
  bestMass: number;
  bestRank: number;
  bestCombo: number;
  missionsCleared: number;
  updatedAt: number;
};

const STORAGE_KEY = "play29:agar-best-v1";

export function missionTargets(tier: AgarAiDifficulty): Record<AgarMissionId, number> {
  if (tier === "superhard") {
    return { hunter: 7, virus_survivor: 2, eject_master: 7, split_attack: 2, top3: 1 };
  }
  if (tier === "hard") {
    return { hunter: 5, virus_survivor: 1, eject_master: 5, split_attack: 1, top3: 1 };
  }
  return { hunter: 3, virus_survivor: 1, eject_master: 5, split_attack: 1, top3: 1 };
}

const MISSION_META: Record<AgarMissionId, { emoji: string; label: string }> = {
  hunter: { emoji: "🍖", label: "Hunter" },
  virus_survivor: { emoji: "🦠", label: "Virus Survivor" },
  eject_master: { emoji: "⚡", label: "Eject Master" },
  split_attack: { emoji: "💥", label: "Split Attack" },
  top3: { emoji: "👑", label: "Top 3" },
};

export function createSessionStats(): AgarSessionStats {
  return {
    botsEaten: 0,
    virusEscapes: 0,
    ejectCount: 0,
    splitKills: 0,
    peakRank: 99,
    peakMass: 0,
    bestCombo: 0,
    missionsComplete: [],
  };
}

export function buildMissionList(
  tier: AgarAiDifficulty,
  stats: AgarSessionStats
): AgarMissionProgress[] {
  const targets = missionTargets(tier);
  return (Object.keys(targets) as AgarMissionId[]).map((id) => {
    const target = targets[id];
    const current =
      id === "hunter"
        ? stats.botsEaten
        : id === "virus_survivor"
          ? stats.virusEscapes
          : id === "eject_master"
            ? stats.ejectCount
            : id === "split_attack"
              ? stats.splitKills
              : stats.peakRank <= 3
                ? 1
                : 0;
    const done = current >= target;
    return {
      id,
      emoji: MISSION_META[id].emoji,
      label: MISSION_META[id].label,
      target,
      current: id === "top3" ? (stats.peakRank <= 3 ? 1 : 0) : current,
      done,
    };
  });
}

export function syncMissionComplete(stats: AgarSessionStats, tier: AgarAiDifficulty): void {
  const list = buildMissionList(tier, stats);
  stats.missionsComplete = list.filter((m) => m.done).map((m) => m.id);
}

export function loadBestRecord(): AgarBestRecord {
  if (typeof window === "undefined") {
    return { bestMass: 0, bestRank: 99, bestCombo: 0, missionsCleared: 0, updatedAt: 0 };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { bestMass: 0, bestRank: 99, bestCombo: 0, missionsCleared: 0, updatedAt: 0 };
    }
    const parsed = JSON.parse(raw) as AgarBestRecord;
    return {
      bestMass: parsed.bestMass ?? 0,
      bestRank: parsed.bestRank ?? 99,
      bestCombo: parsed.bestCombo ?? 0,
      missionsCleared: parsed.missionsCleared ?? 0,
      updatedAt: parsed.updatedAt ?? 0,
    };
  } catch {
    return { bestMass: 0, bestRank: 99, bestCombo: 0, missionsCleared: 0, updatedAt: 0 };
  }
}

export function saveBestRecord(run: AgarRunSummary): AgarBestRecord {
  const prev = loadBestRecord();
  const next: AgarBestRecord = {
    bestMass: Math.max(prev.bestMass, run.finalMass, run.peakMass),
    bestRank: Math.min(prev.bestRank, run.finalRank, run.peakRank),
    bestCombo: Math.max(prev.bestCombo, run.bestCombo),
    missionsCleared: Math.max(prev.missionsCleared, run.missionsComplete.length),
    updatedAt: Date.now(),
  };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* quota / private mode */
    }
  }
  return next;
}

/** Combo bonus mass — capped so large cells don't snowball. */
export function comboBonusMass(baseMass: number, combo: number, cellMass: number): number {
  if (combo < 2) return 0;
  const stacks = Math.min(combo, 5);
  const pct = 0.06 * stacks;
  const raw = baseMass * pct;
  const cap = cellMass > 200 ? 1.2 : cellMass > 100 ? 1.8 : 2.5;
  return Math.min(raw, cap);
}
