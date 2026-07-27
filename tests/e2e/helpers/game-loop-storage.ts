import type { Page } from "@playwright/test";

/** LocalStorage keys used by game-sdk + runtime retention. */
export type GameLoopProgressSnapshot = {
  bestStage: number | null;
  bestScore: number | null;
  bestTile: number | null;
  retryCount: number;
  playCount: number;
  totalPlayTimeMs: number;
  totalScoreSum: number;
  sessionCount: number;
  lastCrashAt: string | null;
  avgPlayTimeMs: number | null;
  avgScore: number | null;
  retryRate: number | null;
};

export type GameLoopStorageSnapshot = {
  xp: number;
  coins: number;
  bestScore: number;
  dailyMission: string | null;
  journey: string | null;
  gamePlayCounts: string | null;
  replayMoments: string | null;
  totalPlayCount: number;
  progress: GameLoopProgressSnapshot | null;
};

export async function readGameLoopStorage(
  page: Page,
  slug: string
): Promise<GameLoopStorageSnapshot> {
  return page.evaluate((gameSlug) => {
    const num = (key: string) => Number(window.localStorage.getItem(key) ?? 0) || 0;
    const progressKey = `play29:save:${gameSlug}-progress`;
    let progress: GameLoopStorageSnapshot["progress"] = null;
    try {
      const raw = window.localStorage.getItem(progressKey);
      if (raw) {
        const envelope = JSON.parse(raw) as { state?: Record<string, unknown> };
        const p = envelope.state ?? {};
        const playCount = Number(p.playCount ?? 0) || 0;
        const retryCount = Number(p.retryCount ?? 0) || 0;
        const sessionCount = Number(p.sessionCount ?? 0) || 0;
        const totalPlayTimeMs = Number(p.totalPlayTimeMs ?? 0) || 0;
        const totalScoreSum = Number(p.totalScoreSum ?? 0) || 0;
        progress = {
          bestStage: Number(p.bestStage ?? 0) || null,
          bestScore: Number(p.bestScore ?? 0) || null,
          bestTile: Number(p.bestTile ?? 0) || null,
          retryCount,
          playCount,
          totalPlayTimeMs,
          totalScoreSum,
          sessionCount,
          lastCrashAt: typeof p.lastCrashAt === "string" ? p.lastCrashAt : null,
          avgPlayTimeMs: sessionCount > 0 ? Math.round(totalPlayTimeMs / sessionCount) : null,
          avgScore: sessionCount > 0 ? Math.round(totalScoreSum / sessionCount) : null,
          retryRate: playCount > 0 ? retryCount / playCount : null,
        };
      }
    } catch {
      progress = null;
    }

    return {
      xp: num("play29:xp"),
      coins: num("play29:coins"),
      bestScore: num(`play29:best-score:${gameSlug}`),
      dailyMission: window.localStorage.getItem("play29:daily-mission"),
      journey: window.localStorage.getItem("play29:journey-profile"),
      gamePlayCounts: window.localStorage.getItem("play29:game-play-counts"),
      replayMoments: window.localStorage.getItem("play29:replay-moments"),
      totalPlayCount: num("play29:total-play-count"),
      progress,
    };
  }, slug);
}

export async function seedGameLoopSession(page: Page, slug: string): Promise<void> {
  await page.addInitScript((gameSlug) => {
    window.localStorage.setItem(`play29:runtime-tutorial-seen:${gameSlug}`, "1");
    window.localStorage.removeItem(`play29:save:${gameSlug}`);
  }, slug);
}
