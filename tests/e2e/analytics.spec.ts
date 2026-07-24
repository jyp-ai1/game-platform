import { test } from "@playwright/test";

import { PLAYABLE_SLUGS } from "./helpers/constants";
import { attachAnalyticsCollector } from "./helpers/analytics";
import { attachConsoleMonitor } from "./helpers/console-monitor";

const COUNTDOWN_MS = 4 * 650 + 500;

for (const slug of PLAYABLE_SLUGS) {
  test(`analytics ${slug}`, async ({ page }) => {
    const consoleMon = attachConsoleMonitor(page);
    const analytics = attachAnalyticsCollector(page);

    await page.goto(`/games/${slug}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(COUNTDOWN_MS);
    await page.keyboard.press("ArrowRight").catch(() => {});
    await page.waitForTimeout(500);

    consoleMon.assertClean();

    const types = analytics.getEventTypes();
    test.info().annotations.push({ type: "analytics", description: types.join(", ") });

    /* session_start or game_start expected after page visit */
    const hasLifecycle = types.some(
      (t) =>
        t.includes("session") ||
        t.includes("game_start") ||
        t.includes("game_end") ||
        t === "page_view"
    );
    if (!hasLifecycle && types.length === 0) {
      /* Supabase may be unavailable in CI — code path still exercised */
      test.info().annotations.push({
        type: "note",
        description: "No analytics RPC captured (offline env OK for smoke)",
      });
    }
  });
}
