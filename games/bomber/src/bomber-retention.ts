/**
 * GAME-DEV-011 — missions, session stats, localStorage best records.
 * Bomber-only retention layer (no platform / Supabase).
 */

export type BomberMissionId = "destroy_20" | "chain_3" | "collect_5" | "defeat_10";

export type BomberMissionDef = {
  id: BomberMissionId;
  emoji: string;
  label: string;
  target: number;
};

export type BomberMissionProgress = BomberMissionDef & {
  current: number;
  done: boolean;
};

export type BomberSessionStats = {
  blocksDestroyed: number;
  itemsCollected: number;
  enemiesDefeated: number;
  bestChain: number;
  peakScore: number;
  missionsComplete: BomberMissionId[];
};

export type BomberRunSummary = BomberSessionStats & {
  finalScore: number;
  finalKills: number;
};

export type BomberBestRecord = {
  bestScore: number;
  bestChain: number;
  blocksDestroyed: number;
  enemiesDefeated: number;
  missionsCleared: number;
  updatedAt: number;
};

const STORAGE_KEY = "play29:bomber-best-v1";

const MISSION_META: Record<BomberMissionId, { emoji: string; label: string; target: number }> = {
  destroy_20: { emoji: "🧱", label: "Destroy 20 Blocks", target: 20 },
  chain_3: { emoji: "⛓️", label: "Chain x3", target: 3 },
  collect_5: { emoji: "🎁", label: "Collect 5 Items", target: 5 },
  defeat_10: { emoji: "💀", label: "Defeat 10 Enemies", target: 10 },
};

export function createSessionStats(): BomberSessionStats {
  return {
    blocksDestroyed: 0,
    itemsCollected: 0,
    enemiesDefeated: 0,
    bestChain: 0,
    peakScore: 0,
    missionsComplete: [],
  };
}

export function buildMissionList(stats: BomberSessionStats): BomberMissionProgress[] {
  return (Object.keys(MISSION_META) as BomberMissionId[]).map((id) => {
    const meta = MISSION_META[id];
    const current =
      id === "destroy_20"
        ? stats.blocksDestroyed
        : id === "chain_3"
          ? stats.bestChain
          : id === "collect_5"
            ? stats.itemsCollected
            : stats.enemiesDefeated;
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

export function syncMissionComplete(stats: BomberSessionStats): void {
  const list = buildMissionList(stats);
  stats.missionsComplete = list.filter((m) => m.done).map((m) => m.id);
}

export function loadBestRecord(): BomberBestRecord {
  if (typeof window === "undefined") {
    return {
      bestScore: 0,
      bestChain: 0,
      blocksDestroyed: 0,
      enemiesDefeated: 0,
      missionsCleared: 0,
      updatedAt: 0,
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        bestScore: 0,
        bestChain: 0,
        blocksDestroyed: 0,
        enemiesDefeated: 0,
        missionsCleared: 0,
        updatedAt: 0,
      };
    }
    const parsed = JSON.parse(raw) as BomberBestRecord;
    return {
      bestScore: parsed.bestScore ?? 0,
      bestChain: parsed.bestChain ?? 0,
      blocksDestroyed: parsed.blocksDestroyed ?? 0,
      enemiesDefeated: parsed.enemiesDefeated ?? 0,
      missionsCleared: parsed.missionsCleared ?? 0,
      updatedAt: parsed.updatedAt ?? 0,
    };
  } catch {
    return {
      bestScore: 0,
      bestChain: 0,
      blocksDestroyed: 0,
      enemiesDefeated: 0,
      missionsCleared: 0,
      updatedAt: 0,
    };
  }
}

export function saveBestRecord(run: BomberRunSummary): BomberBestRecord {
  const prev = loadBestRecord();
  const next: BomberBestRecord = {
    bestScore: Math.max(prev.bestScore, run.finalScore, run.peakScore),
    bestChain: Math.max(prev.bestChain, run.bestChain),
    blocksDestroyed: Math.max(prev.blocksDestroyed, run.blocksDestroyed),
    enemiesDefeated: Math.max(prev.enemiesDefeated, run.enemiesDefeated),
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
