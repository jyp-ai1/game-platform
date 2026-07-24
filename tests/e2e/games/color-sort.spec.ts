import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Color Sort", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "color-sort");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "color-sort");
  });
});
