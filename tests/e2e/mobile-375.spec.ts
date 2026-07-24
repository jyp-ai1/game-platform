import { test, expect } from "@playwright/test";

import { PLAYABLE_SLUGS } from "./helpers/constants";

test.use({ viewport: { width: 375, height: 812 } });

test.describe("Mobile UX 375px", () => {
  for (const slug of PLAYABLE_SLUGS) {
    test(`mobile ${slug}`, async ({ page }) => {
      await page.goto(`/games/${slug}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(3500);
      await expect(page.locator("h1").first()).toBeVisible({ timeout: 20_000 });
      await expect(page).toHaveScreenshot(`mobile-${slug}.png`, {
        fullPage: false,
        animations: "disabled",
        maxDiffPixels: 400,
      });
    });
  }
});
