import { test, expect } from "@playwright/test";

import { attachConsoleMonitor } from "./helpers/console-monitor";

const VIEWPORTS = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1920", width: 1920, height: 1080 },
] as const;

test.describe("Home Visual QA", () => {
  for (const vp of VIEWPORTS) {
    test(`home responsive ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const monitor = attachConsoleMonitor(page);

      await page.goto("/", { waitUntil: "domcontentloaded" });

      // Skeleton should appear briefly then resolve
      const skeleton = page.getByTestId("home-skeleton");
      await expect(skeleton).toBeVisible({ timeout: 2000 }).catch(() => undefined);
      await expect(page.getByTestId("home-hero-card")).toBeVisible({ timeout: 15_000 });

      // LIVE badge + continue section (row or hidden)
      await expect(page.getByTestId("platform-live-badge")).toBeVisible();

      const continueRow = page.getByTestId("home-continue-row");
      const continueSection = page.getByTestId("home-continue");
      if (await continueRow.count()) {
        await expect(continueSection).toBeVisible();
      } else {
        await expect(continueSection).toHaveCount(0);
      }

      // No horizontal overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
      });
      expect(overflow, "horizontal overflow").toBe(false);

      monitor.assertClean();
    });
  }

  test("home skeleton then content", async ({ page }) => {
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.getByTestId("home-skeleton")).toBeVisible({ timeout: 3000 });
    await expect(page.getByTestId("home-hero-card")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("home-skeleton")).toBeHidden({ timeout: 15_000 });
  });

  test("home empty continue section hidden", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);

    const row = page.getByTestId("home-continue-row");
    const section = page.getByTestId("home-continue");

    if (await row.count()) {
      await expect(section).toBeVisible();
      await expect(row.first()).toBeVisible();
    } else {
      await expect(section).toBeHidden();
      await expect(page.getByTestId("home-continue-empty")).toBeHidden();
    }
  });
});
