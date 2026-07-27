import type { Page } from "@playwright/test";

/** LocalStorage keys used by game-sdk + runtime retention. */
export type GameLoopStorageSnapshot = {
  xp: number;
  coins: number;
  bestScore: number;
  dailyMission: string | null;
  journey: string | null;
  gamePlayCounts: string | null;
  replayMoments: string | null;
  totalPlayCount: number;
};

export async function readGameLoopStorage(
  page: Page,
  slug: string
): Promise<GameLoopStorageSnapshot> {
  return page.evaluate((gameSlug) => {
    const num = (key: string) => Number(window.localStorage.getItem(key) ?? 0) || 0;
    return {
      xp: num("play29:xp"),
      coins: num("play29:coins"),
      bestScore: num(`play29:best-score:${gameSlug}`),
      dailyMission: window.localStorage.getItem("play29:daily-mission"),
      journey: window.localStorage.getItem("play29:journey-profile"),
      gamePlayCounts: window.localStorage.getItem("play29:game-play-counts"),
      replayMoments: window.localStorage.getItem("play29:replay-moments"),
      totalPlayCount: num("play29:total-play-count"),
    };
  }, slug);
}

export async function seedGameLoopSession(page: Page, slug: string): Promise<void> {
  await page.addInitScript((gameSlug) => {
    window.localStorage.setItem(`play29:runtime-tutorial-seen:${gameSlug}`, "1");
    window.localStorage.removeItem(`play29:save:${gameSlug}`);
  }, slug);
}
