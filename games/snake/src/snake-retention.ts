/**
 * GAME-DEV-010 — missions, combo helpers, localStorage best records.
 * Snake-only retention layer (no platform / Supabase).
 */

export type SnakeMissionId = "eat_20" | "combo_5" | "near_miss_3" | "score_1000";

export type SnakeMissionDef = {
  id: SnakeMissionId;
  emoji: string;
  label: string;
  target: number;
};

export type SnakeMissionProgress = SnakeMissionDef & {
  current: number;
  done: boolean;
};

export type SnakeSessionStats = {
  foodEaten: number;
  nearMissCount: number;
  bestCombo: number;
  peakScore: number;
  maxLength: number;
  missionsComplete: SnakeMissionId[];
};

export type SnakeRunSummary = SnakeSessionStats & {
  finalScore: number;
  finalLength: number;
};

export type SnakeBestRecord = {
  bestScore: number;
  bestLength: number;
  bestCombo: number;
  missionsCleared: number;
  updatedAt: number;
};

const STORAGE_KEY = "play29:snake-best-v1";

const MISSION_META: Record<SnakeMissionId, { emoji: string; label: string; target: number }> = {
  eat_20: { emoji: "🍎", label: "Eat 20 Food", target: 20 },
  combo_5: { emoji: "🔥", label: "Combo x5", target: 5 },
  near_miss_3: { emoji: "💨", label: "Near Miss x3", target: 3 },
  score_1000: { emoji: "⭐", label: "Score 1000", target: 1000 },
};

export function createSessionStats(): SnakeSessionStats {
  return {
    foodEaten: 0,
    nearMissCount: 0,
    bestCombo: 0,
    peakScore: 0,
    maxLength: 0,
    missionsComplete: [],
  };
}

export function buildMissionList(stats: SnakeSessionStats): SnakeMissionProgress[] {
  return (Object.keys(MISSION_META) as SnakeMissionId[]).map((id) => {
    const meta = MISSION_META[id];
    const current =
      id === "eat_20"
        ? stats.foodEaten
        : id === "combo_5"
          ? stats.bestCombo
          : id === "near_miss_3"
            ? stats.nearMissCount
            : stats.peakScore;
    const done = current >= meta.target;
    return {
      id,
      emoji: meta.emoji,
      label: meta.label,
      target: meta.target,
      current,
      done,
    };
  });
}

export function syncMissionComplete(stats: SnakeSessionStats): void {
  const list = buildMissionList(stats);
  stats.missionsComplete = list.filter((m) => m.done).map((m) => m.id);
}

export function loadBestRecord(): SnakeBestRecord {
  if (typeof window === "undefined") {
    return { bestScore: 0, bestLength: 0, bestCombo: 0, missionsCleared: 0, updatedAt: 0 };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { bestScore: 0, bestLength: 0, bestCombo: 0, missionsCleared: 0, updatedAt: 0 };
    }
    const parsed = JSON.parse(raw) as SnakeBestRecord;
    return {
      bestScore: parsed.bestScore ?? 0,
      bestLength: parsed.bestLength ?? 0,
      bestCombo: parsed.bestCombo ?? 0,
      missionsCleared: parsed.missionsCleared ?? 0,
      updatedAt: parsed.updatedAt ?? 0,
    };
  } catch {
    return { bestScore: 0, bestLength: 0, bestCombo: 0, missionsCleared: 0, updatedAt: 0 };
  }
}

export function saveBestRecord(run: SnakeRunSummary): SnakeBestRecord {
  const prev = loadBestRecord();
  const next: SnakeBestRecord = {
    bestScore: Math.max(prev.bestScore, run.finalScore, run.peakScore),
    bestLength: Math.max(prev.bestLength, run.finalLength, run.maxLength),
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

/** Combo bonus score — capped so streaks don't snowball. */
export function comboBonusScore(baseScore: number, combo: number): number {
  if (combo < 2) return 0;
  const stacks = Math.min(combo, 8);
  return Math.round(baseScore * 0.12 * (stacks - 1));
}
