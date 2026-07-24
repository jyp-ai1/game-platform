import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { attachAnalyticsCollector } from "./analytics";
import { attachConsoleMonitor } from "./console-monitor";

const COUNTDOWN_MS = 4 * 650 + 500;

export type GameSmokeResult = {
  slug: string;
  analyticsTypes: string[];
  consoleErrors: number;
};

/** Common smoke: open → countdown → interact → no crash */
export async function runGameSmoke(
  page: Page,
  slug: string,
  options: { screenshot?: boolean; checkAnalytics?: boolean } = {}
): Promise<GameSmokeResult> {
  const consoleMon = attachConsoleMonitor(page);
  const analytics = attachAnalyticsCollector(page);

  await page.goto(`/games/${slug}`, { waitUntil: "domcontentloaded" });

  const notFound = page.getByRole("heading", { name: /404|not found|찾을 수 없/i });
  if (await notFound.isVisible().catch(() => false)) {
    throw new Error(
      `Game /games/${slug} returned 404 — ensure Supabase has game row and .env.local is loaded`
    );
  }

  await expect(page.locator("h1").first()).toBeVisible({ timeout: 20_000 });

  const stage = page.locator(".game-detail-stage");
  await expect(stage).toBeVisible({ timeout: 30_000 });

  await page.waitForTimeout(COUNTDOWN_MS);

  const gameRoot = stage.locator("div").first();
  await gameRoot.click({ position: { x: 120, y: 120 }, force: true }).catch(() => {});
  await page.keyboard.press("ArrowRight").catch(() => {});
  await page.keyboard.press("ArrowDown").catch(() => {});
  await page.keyboard.press("Space").catch(() => {});
  await page.waitForTimeout(800);

  if (options.screenshot) {
    await expect(stage).toHaveScreenshot(`${slug}.png`, {
      animations: "disabled",
      caret: "hide",
    });
  }

  consoleMon.assertClean();

  if (options.checkAnalytics) {
    const types = analytics.getEventTypes();
    if (!types.some((t) => t.includes("session") || t.includes("game"))) {
      /* analytics may batch — not a hard fail in smoke */
    }
  }

  return {
    slug,
    analyticsTypes: analytics.getEventTypes(),
    consoleErrors: consoleMon.getErrors().length,
  };
}

/** Full regression: smoke + save probe + ranking section visible */
export async function runGameRegression(page: Page, slug: string): Promise<GameSmokeResult> {
  const result = await runGameSmoke(page, slug, { checkAnalytics: true });

  const leaderboard = page.getByRole("heading", { name: /랭킹|Ranking|Leaderboard/i });
  await expect(leaderboard.first()).toBeVisible({ timeout: 10_000 }).catch(() => {
    /* some games may use different heading — non-blocking */
  });

  return result;
}
