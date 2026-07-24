import { test, expect } from "@playwright/test";

import { PLAYABLE_SLUGS } from "./helpers/constants";

test.describe("Performance metrics", () => {
  for (const slug of PLAYABLE_SLUGS.slice(0, 15)) {
    test(`perf /games/${slug}`, async ({ page }) => {
      await page.goto(`/games/${slug}`, { waitUntil: "domcontentloaded" });

      const metrics = await page.evaluate(() => {
        const nav = performance.getEntriesByType(
          "navigation"
        )[0] as PerformanceNavigationTiming | undefined;
        const paint = performance.getEntriesByType("paint");
        const fcp = paint.find((p) => p.name === "first-contentful-paint");
        return {
          domContentLoaded: nav?.domContentLoadedEventEnd ?? 0,
          loadEventEnd: nav?.loadEventEnd ?? 0,
          fcp: fcp?.startTime ?? 0,
        };
      });

      expect(metrics.domContentLoaded).toBeGreaterThan(0);
      expect(metrics.domContentLoaded).toBeLessThan(15_000);
      expect(metrics.fcp).toBeLessThan(12_000);
    });
  }
});

test("home performance", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const fcp = await page.evaluate(() => {
    const paint = performance.getEntriesByType("paint");
    return paint.find((p) => p.name === "first-contentful-paint")?.startTime ?? 0;
  });
  expect(fcp).toBeGreaterThan(0);
  expect(fcp).toBeLessThan(10_000);
});
