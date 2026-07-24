import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

import { PLAYABLE_SLUGS, STATIC_ROUTES } from "./helpers/constants";

for (const route of STATIC_ROUTES) {
  test(`a11y ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const results = await new AxeBuilder({ page })
      .disableRules(["color-contrast"])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}

test.describe("Game pages accessibility", () => {
  for (const slug of PLAYABLE_SLUGS.slice(0, 10)) {
    test(`a11y /games/${slug}`, async ({ page }) => {
      await page.goto(`/games/${slug}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(3000);
      const results = await new AxeBuilder({ page })
        .disableRules(["color-contrast"])
        .analyze();
      expect(
        results.violations.filter((v) => v.impact === "critical" || v.impact === "serious"),
        JSON.stringify(results.violations, null, 2)
      ).toEqual([]);
    });
  }
});
