/** Replay Moments — auto-capture highlight events */
import type { MomentKind, ReplayMoment } from "@game-platform/shared";

const STORAGE_KEY = "play29:replay-moments";
let momentCounter = 0;

export function captureMoment(
  kind: MomentKind,
  deviceId: string,
  nickname: string,
  tick: number,
  meta?: Record<string, unknown>
): ReplayMoment {
  const moment: ReplayMoment = {
    id: `mom-${++momentCounter}`,
    kind,
    deviceId,
    nickname,
    tick,
    createdAt: new Date().toISOString(),
    meta,
  };
  persist(moment);
  return moment;
}

function persist(m: ReplayMoment): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list: ReplayMoment[] = raw ? JSON.parse(raw) : [];
    list.unshift(m);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 100)));
  } catch { /* ignore */ }
}

export function getRecentMoments(limit = 20): ReplayMoment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ReplayMoment[]).slice(0, limit) : [];
  } catch {
    return [];
  }
}

export const MOMENT_LABELS: Record<MomentKind, string> = {
  triple_kill: "🔥 Triple Kill",
  near_death: "Near Death",
  longest_escape: "Longest Escape",
  boss_slayer: "👑 Boss Slayer",
  comeback: "Comeback",
  top10_entry: "Top 10 Entry",
  first_kill: "💀 First Kill",
  giant_slayer: "💀 Giant Slayer",
  revenge: "⚔️ Revenge",
  survival_5min: "⏱️ 5 Min Survival",
};

export const MomentsEngine = { capture: captureMoment, recent: getRecentMoments, labels: MOMENT_LABELS };
